<?php

namespace App\Services;

use App\Exceptions\InsufficientStockException;
use App\Models\Order;
use Illuminate\Support\Facades\DB;

/**
 * Objective 3: stock syncs the instant a transaction completes.
 *
 * Stock is decremented ONLY here, and only when payment is confirmed (see
 * DECISIONS.md). Nothing else in the codebase may write to a stock column.
 */
class InventoryService
{
    /**
     * Mark an order paid and take its stock off the shelf, atomically.
     *
     * Marking paid and decrementing live in ONE transaction on purpose. Split
     * across two, a crash between them leaves a paid order whose stock was
     * never deducted — silent oversell, and exactly the bug objective 3 exists
     * to prevent.
     *
     * @param  array<string, string|null>  $paymongoRefs  Optional gateway ids.
     *
     * @throws InsufficientStockException  Rolls the whole transaction back.
     */
    public function commitForPaidOrder(Order $order, array $paymongoRefs = []): Order
    {
        return DB::transaction(function () use ($order, $paymongoRefs) {
            // Re-read under a lock. Guards against two PayMongo webhook
            // deliveries for the same order racing each other.
            /** @var Order $order */
            $order = Order::query()
                ->whereKey($order->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            // Idempotency: PayMongo can deliver the same webhook more than
            // once. A second delivery must be a no-op, not a second decrement.
            if ($order->stockIsCommitted()) {
                return $order;
            }

            foreach ($this->requiredQuantities($order) as $row) {
                $this->decrementOne($row['type'], $row['id'], $row['quantity']);
            }

            $order->fill(array_filter([
                'paymongo_payment_intent_id' => $paymongoRefs['payment_intent_id'] ?? null,
                'paymongo_source_id' => $paymongoRefs['source_id'] ?? null,
                'paymongo_payment_id' => $paymongoRefs['payment_id'] ?? null,
            ]));

            $order->status = Order::STATUS_PAID;
            $order->paid_at = now();
            $order->save();

            return $order;
        });
    }

    /**
     * Collapse the order's lines into one required quantity per purchasable.
     *
     * Two lines can point at the same variant (added to the cart twice), and
     * locking/checking each line separately would approve both against the
     * same stock. Sorted so concurrent orders always take locks in the same
     * order, which is what stops them deadlocking each other.
     *
     * @return array<int, array{type: class-string, id: int, quantity: int}>
     */
    private function requiredQuantities(Order $order): array
    {
        $totals = [];

        foreach ($order->items as $item) {
            $key = $item->purchasable_type.'#'.$item->purchasable_id;

            if (! isset($totals[$key])) {
                $totals[$key] = [
                    'type' => $item->purchasable_type,
                    'id' => (int) $item->purchasable_id,
                    'quantity' => 0,
                ];
            }

            $totals[$key]['quantity'] += (int) $item->quantity;
        }

        ksort($totals);

        return array_values($totals);
    }

    /**
     * Lock one purchasable's row, verify stock, then decrement.
     *
     * The check MUST happen inside the transaction and behind the lock. Stock
     * read before the transaction is already stale — the cart does not reserve.
     */
    private function decrementOne(string $type, int $id, int $quantity): void
    {
        /** @var \App\Contracts\Purchasable&\Illuminate\Database\Eloquent\Model $model */
        $model = $type::query()
            ->whereKey($id)
            ->lockForUpdate()
            ->firstOrFail();

        if ($model->availableStock() < $quantity) {
            throw InsufficientStockException::for($model, $quantity);
        }

        // Atomic SQL decrement rather than read-modify-write in PHP.
        $model->decrement('stock', $quantity);
    }
}
