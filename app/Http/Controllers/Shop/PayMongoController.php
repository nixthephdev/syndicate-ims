<?php

namespace App\Http\Controllers\Shop;

use App\Exceptions\InsufficientStockException;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\InventoryService;
use App\Services\PayMongoClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

/**
 * GCash through PayMongo's Payment Intents API (test mode). Restored
 * 2026-10-06 at the client's request, replacing the receipt-upload flow.
 *
 * create() only gets the customer to PayMongo's GCash page — it never marks
 * anything paid. returnFromCheckout() is what confirms, by ASKING PayMongo.
 *
 * There is deliberately no webhook. This app runs on a local laptop and
 * PayMongo's servers cannot reach it, so a webhook would never fire. If the
 * customer closes the tab after paying, create() checks the stored intent
 * before starting a new one, so pressing "Pay" again settles the order
 * instead of charging twice.
 */
class PayMongoController extends Controller
{
    public function create(
        Request $request,
        string $orderNumber,
        PayMongoClient $paymongo,
        InventoryService $inventory
    ): Response {
        $order = $this->ownedOrder($request, $orderNumber);

        if ($order->status !== Order::STATUS_AWAITING_PAYMENT) {
            return back()->withErrors(['payment' => 'This order is not awaiting payment.']);
        }

        // Cash-on-pickup has no online leg — staff confirm it at the branch.
        // The page never renders a GCash button for one, but a POST can.
        if (! $order->paysOnline()) {
            return back()->withErrors(['payment' => 'This order is set to pay by cash, not GCash.']);
        }

        try {
            // Paid on a previous attempt but never got back here (closed tab,
            // dropped connection)? Settle it rather than charge a second time.
            if ($order->paymongo_payment_intent_id) {
                $previous = $paymongo->getPaymentIntent($order->paymongo_payment_intent_id);

                if ($previous['status'] === 'succeeded') {
                    return $this->settle($order, $previous, $inventory);
                }
            }

            $intent = $paymongo->createPaymentIntent(
                $order->amountDueNowCentavos(),
                'Syndicate Supply Co. order '.$order->order_number
            );

            // Saved before the redirect — returnFromCheckout() compares
            // against this, never against anything the browser carries.
            $order->forceFill(['paymongo_payment_intent_id' => $intent['id']])->save();

            $method = $paymongo->createGcashPaymentMethod();

            $attached = $paymongo->attachPaymentMethod(
                $intent['id'],
                $method['id'],
                $intent['client_key'],
                route('payment.paymongo.return', $order->order_number)
            );
        } catch (RuntimeException $e) {
            report($e);

            return back()->withErrors([
                'payment' => 'Could not start payment with PayMongo. Nothing was charged. Try again in a moment.',
            ]);
        }

        if (! $attached['redirect_url']) {
            return back()->withErrors([
                'payment' => 'PayMongo did not return a checkout page. Nothing was charged.',
            ]);
        }

        // Inertia::location(), not redirect(): Inertia's client would follow
        // a plain redirect as an XHR and never actually leave the site.
        return Inertia::location($attached['redirect_url']);
    }

    /**
     * Where PayMongo sends the customer back after the GCash page.
     *
     * Trust rules, in order:
     *   1. The order must belong to the signed-in customer.
     *   2. The ?payment_intent_id= is only COMPARED against the one stored at
     *      create() time — never used to look an order up, or anyone could
     *      append a stranger's succeeded intent id to their own order.
     *   3. Whether it got paid is asked of PayMongo's API. The URL is a hint.
     *
     * Idempotent: commitForPaidOrder()'s stockIsCommitted() guard makes a
     * reload or double-landing a no-op. Stock decrements once.
     */
    public function returnFromCheckout(
        Request $request,
        string $orderNumber,
        PayMongoClient $paymongo,
        InventoryService $inventory
    ): RedirectResponse {
        $order = $this->ownedOrder($request, $orderNumber);
        $to = redirect()->route('orders.show', $order->order_number);

        if ($order->stockIsCommitted()) {
            return $to;
        }

        $intentId = $order->paymongo_payment_intent_id;

        if (! $intentId || $request->query('payment_intent_id') !== $intentId) {
            return $to;
        }

        try {
            $intent = $paymongo->getPaymentIntent($intentId);
        } catch (RuntimeException $e) {
            report($e);

            return $to->withErrors([
                'payment' => 'We could not confirm your payment with PayMongo just now. '
                    .'If money left your account, press Pay again and it will be applied, not charged twice.',
            ]);
        }

        if ($intent['status'] !== 'succeeded') {
            return $to->withErrors([
                'payment' => 'That payment was not completed, so nothing was charged. You can try again.',
            ]);
        }

        return $this->settle($order, $intent, $inventory);
    }

    /** @param  array{payment_id: ?string}  $intent  A SUCCEEDED intent. */
    private function settle(Order $order, array $intent, InventoryService $inventory): RedirectResponse
    {
        $to = redirect()->route('orders.show', $order->order_number);

        $order->forceFill(['paymongo_payment_id' => $intent['payment_id']])->save();

        try {
            $inventory->commitForPaidOrder($order,$order->paidStatusForPaymentMethod());
        } catch (InsufficientStockException $e) {
            // Money moved but an item sold out while they were paying — the
            // race the cart accepts by not reserving. Needs a human.
            report($e);

            return $to->withErrors([
                'payment' => 'Your payment went through, but an item sold out while you were paying. '
                    .'Please contact us and we will sort it out.',
            ]);
        }

        return $to->with('success', 'Payment confirmed. Thank you!');
    }

    private function ownedOrder(Request $request, string $orderNumber): Order
    {
        $order = Order::query()->where('order_number', $orderNumber)->firstOrFail();

        abort_unless($order->user_id === $request->user()->id, 403);

        return $order;
    }
}
