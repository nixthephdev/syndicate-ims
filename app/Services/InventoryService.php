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
     * @param  string  $targetStatus  Order::STATUS_PAID by default. A
     *   delivery order's 50% deposit also commits stock — the whole point
     *   of a deposit is that it reserves the item — but must land on
     *   Order::STATUS_DEPOSIT_PAID instead, since the balance is still due
     *   in cash on delivery. Nothing else about the lock/idempotency/decrement
     *   logic below changes; only which status it lands on does.
     *
     * @throws InsufficientStockException  Rolls the whole transaction back.
     */
    public function commitForPaidOrder(Order $order, string $targetStatus = Order::STATUS_PAID): Order
    {
        return DB::transaction(function () use ($order, $targetStatus) {
            // Re-read under a lock. Guards against two staff confirming the
            // same order's payment at the same moment.
            /** @var Order $order */
            $order = Order::query()
                ->whereKey($order->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            // Idempotency: a double-click, or two people working the queue,
            // must be a no-op rather than a second decrement.
            if ($order->stockIsCommitted()) {
                return $order;
            }

            foreach ($this->requiredQuantities($order) as $row) {
                $this->decrementOne($row['type'], $row['id'], $row['quantity']);
            }

            $order->status = $targetStatus;
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
