<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\InsufficientStockException;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\InventoryService;
use Illuminate\Http\RedirectResponse;

/**
 * A staff member confirming CASH was collected at the branch.
 *
 * Cash only. A GCash order is confirmed by PayMongo
 * (Shop\PayMongoController::returnFromCheckout()), never by a button here —
 * letting staff mark one paid would mean a GCash order could be "paid" with
 * no money ever having moved through PayMongo.
 *
 * Kept out of OrderStatusController on purpose — that controller's docblock
 * promises it never touches stock, and this does, through the same
 * InventoryService::commitForPaidOrder() every payment uses.
 */
class OrderPaymentController extends Controller
{
    public function confirm(string $orderNumber, InventoryService $inventory): RedirectResponse
    {
        $order = Order::query()->where('order_number', $orderNumber)->with('items')->firstOrFail();

        if ($order->status !== Order::STATUS_AWAITING_PAYMENT) {
            return back()->withErrors([
                'payment' => 'This order is not awaiting payment.',
            ]);
        }

        if ($order->payment_method !== Order::PAYMENT_METHOD_CASH) {
            return back()->withErrors([
                'payment' => 'GCash orders are confirmed by PayMongo, not by hand.',
            ]);
        }

        try {
            $inventory->commitForPaidOrder($order, $order->paidStatusForPaymentMethod());
        } catch (InsufficientStockException $e) {
            // The goods went while it sat in the queue — the race the cart
            // deliberately never reserves against. Needs a human.
            return back()->withErrors([
                'payment' => 'Could not confirm — '.$e->getMessage(),
            ]);
        }

        return back()->with('success', $order->order_number.' marked paid (cash).');
    }
}
