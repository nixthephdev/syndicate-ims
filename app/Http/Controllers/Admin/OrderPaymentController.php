<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\InsufficientStockException;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\InventoryService;
use Illuminate\Http\RedirectResponse;

/**
 * A staff member confirming money actually arrived. With no payment gateway,
 * THIS is the only thing in the whole app that marks an order paid and moves
 * stock — every method funnels through here.
 *
 * The customer uploading a receipt (Shop\PaymentProofController) is a claim,
 * not a payment: anyone can attach any image. What makes it real is a human
 * checking the shop's own GCash or bank account and pressing this. Do not
 * collapse those two steps together.
 *
 * Kept out of OrderStatusController on purpose — that controller's docblock
 * promises it never touches stock, and this does, through the same
 * InventoryService::commitForPaidOrder() every payment has always used.
 *
 * A delivery order lands on deposit_paid rather than paid: its online leg is
 * only the 50%, with the balance still due in cash on arrival. That decision
 * lives on the model (Order::paidStatusForPaymentMethod()).
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

        try {
            $inventory->commitForPaidOrder($order, $order->paidStatusForPaymentMethod());
        } catch (InsufficientStockException $e) {
            // Money is in but the goods went while it sat in the queue — the
            // race the cart deliberately never reserves against. Surfaced
            // rather than swallowed: someone has paid for something the shop
            // cannot supply, and that needs a human.
            return back()->withErrors([
                'payment' => 'Could not confirm — '.$e->getMessage(),
            ]);
        }

        $order->refresh();

        return back()->with('success', sprintf(
            '%s marked %s (%s).',
            $order->order_number,
            $order->status === Order::STATUS_DEPOSIT_PAID ? 'deposit paid' : 'paid',
            $order->paymentMethodLabel()
        ));
    }
}
