<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * The only status transitions staff may perform by hand.
 *
 * Deliberately narrow. Two moves are allowed:
 *
 *   paid -> fulfilled          (handed to the customer; stock already gone)
 *   awaiting_payment -> cancelled  (nothing was ever committed)
 *
 * NOT allowed: cancelling a PAID order. That would need the stock putting
 * back and the money refunding, and neither exists — InventoryService has no
 * inverse, on purpose, because "give the stock back" is a different operation
 * from "never took it" and needs its own audit trail. Build a proper
 * refund/restock path before adding it; do not widen the match below.
 */
class OrderStatusController extends Controller
{
    public function update(Request $request, string $orderNumber): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:'.Order::STATUS_FULFILLED.','.Order::STATUS_CANCELLED],
        ]);

        $order = Order::query()->where('order_number', $orderNumber)->firstOrFail();

        $target = $validated['status'];

        $allowed = ($target === Order::STATUS_FULFILLED && $order->status === Order::STATUS_PAID)
            || ($target === Order::STATUS_CANCELLED && $order->status === Order::STATUS_AWAITING_PAYMENT);

        if (! $allowed) {
            return back()->withErrors([
                'status' => sprintf(
                    'Cannot move an order from "%s" to "%s".',
                    str_replace('_', ' ', $order->status),
                    str_replace('_', ' ', $target)
                ),
            ]);
        }

        $order->status = $target;
        $order->save();

        return back()->with(
            'success',
            $target === Order::STATUS_FULFILLED
                ? $order->order_number.' marked fulfilled.'
                : $order->order_number.' cancelled.'
        );
    }
}
