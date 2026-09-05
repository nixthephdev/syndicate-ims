<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\InsufficientStockException;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\InventoryService;
use Illuminate\Http\RedirectResponse;

/**
 * Confirms a cash-on-pickup order was actually paid — staff's real-world
 * equivalent of PayMongo's webhook. Kept separate from OrderStatusController
 * on purpose: that controller's whole docblock is about NEVER touching
 * stock, and this does, via the same InventoryService::commitForPaidOrder()
 * the webhook and the local dev stub (Shop\PaymentController) both use.
 *
 * Only legal for an order that actually opted into cash — an order paying
 * by GCash (or GCash deposit) is confirmed by the webhook alone; a staff
 * member cannot short-circuit that here.
 */
class OrderCashPaymentController extends Controller
{
    public function confirm(string $orderNumber, InventoryService $inventory): RedirectResponse
    {
        $order = Order::query()->where('order_number', $orderNumber)->firstOrFail();

        if ($order->status !== Order::STATUS_AWAITING_PAYMENT || $order->payment_method !== Order::PAYMENT_METHOD_CASH) {
            return back()->withErrors([
                'payment' => 'This order is not awaiting a cash payment.',
            ]);
        }

        try {
            $inventory->commitForPaidOrder($order);
        } catch (InsufficientStockException $e) {
            return back()->withErrors([
                'payment' => 'Could not confirm — '.$e->getMessage(),
            ]);
        }

        return back()->with('success', $order->order_number.' marked paid (cash received).');
    }
}
