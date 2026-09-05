<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Moves an order along its fulfillment journey — the "where is my order?"
 * axis, which is NOT the payment axis OrderStatusController owns.
 *
 * Its own controller for the same reason OrderCashPaymentController is:
 * OrderStatusController's docblock makes a promise about exactly which
 * `status` transitions exist, and this touches a different column entirely.
 *
 * Deliberately one-way and one-step-at-a-time. Staff advance to whatever
 * Order::nextStage() says is next; there is no jumping ahead and no going
 * back. Skipping straight to "Delivered" would let an order be marked
 * complete without ever being prepared, and an undo needs a real audit
 * trail to be meaningful — same standing rule as the refund/restock path
 * that cancelling a paid order still waits on.
 *
 * Reaching the final stage also flips `status` to fulfilled, through the
 * exact same transition OrderStatusController already allows, so the two
 * axes agree and the dashboard's revenue SQL keeps working.
 */
class OrderFulfillmentController extends Controller
{
    public function update(Request $request, string $orderNumber): RedirectResponse
    {
        $validated = $request->validate([
            'stage' => ['required', 'string', 'in:'.implode(',', Order::STAGES)],
        ]);

        $order = Order::query()->where('order_number', $orderNumber)->firstOrFail();

        $next = $order->nextStage();

        if ($next === null || $validated['stage'] !== $next) {
            return back()->withErrors([
                'status' => $next === null
                    ? 'This order cannot be moved any further along.'
                    : sprintf('The next step for this order is "%s".', $order->stageLabel($next)),
            ]);
        }

        $order->fulfillment_stage = $next;

        // Finishing the journey IS being fulfilled — one action, not two, so
        // staff can never leave an order handed over but still showing as
        // unfulfilled in the queue.
        if ($next === Order::STAGE_COMPLETED) {
            $order->status = Order::STATUS_FULFILLED;
        }

        $order->save();

        return back()->with(
            'success',
            $order->order_number.' — '.$order->stageLabel($next).'.'
        );
    }
}
