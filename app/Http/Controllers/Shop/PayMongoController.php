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
 * Starts a REAL GCash payment via PayMongo's Payment Intents API — the
 * thing Shop\PaymentController::confirm() has always said it would be
 * replaced by. That stub is untouched and still exists for local/testing
 * convenience (see its own docblock); this is the actual, non-free path,
 * reachable everywhere including production.
 *
 * create() only ever gets the customer to PayMongo's checkout page and never
 * marks anything paid. TWO things confirm a payment, and neither trusts the
 * browser — both ask PayMongo: the webhook
 * (Webhooks\PayMongoWebhookController), and returnFromCheckout() below, for
 * when PayMongo cannot reach this app to deliver a webhook at all. See that
 * method's docblock for why both are needed and how they stay idempotent.
 */
class PayMongoController extends Controller
{
    public function create(Request $request, string $orderNumber, PayMongoClient $paymongo): Response
    {
        $order = Order::query()->where('order_number', $orderNumber)->firstOrFail();

        abort_unless($order->user_id === $request->user()->id, 403);

        if ($order->status !== Order::STATUS_AWAITING_PAYMENT) {
            return back()->withErrors([
                'payment' => 'This order is not awaiting payment.',
            ]);
        }

        // A cash-pickup order has no online leg at all — staff confirm it
        // directly in the admin panel (Admin\OrderCashPaymentController).
        // Defense in depth: the storefront never renders a GCash button for
        // one of these, but nothing stops a forged request to this route.
        if ($order->payment_method === Order::PAYMENT_METHOD_CASH) {
            return back()->withErrors([
                'payment' => 'This order is set to pay by cash, not GCash.',
            ]);
        }

        // A delivery order only ever charges the 50% deposit here — the
        // remaining balance is cash, collected on delivery, never a second
        // online charge.
        $amount = $order->payment_method === Order::PAYMENT_METHOD_GCASH_DEPOSIT
            ? $order->deposit_centavos
            : $order->total_centavos;

        try {
            $intent = $paymongo->createPaymentIntent(
                $amount,
                'Syndicate IMS order '.$order->order_number
            );

            // Saved immediately, before the redirect — the webhook has
            // nothing else to look the order up by, and it can arrive
            // before the customer's browser even finishes redirecting back.
            $order->paymongo_payment_intent_id = $intent['id'];
            $order->save();

            $method = $paymongo->createGcashPaymentMethod();

            $attached = $paymongo->attachPaymentMethod(
                $intent['id'],
                $method['id'],
                $intent['client_key'],
                // Not the order page directly — PayMongo sends the customer
                // back here so the payment can be reconciled on the spot
                // rather than waiting on a webhook that may never arrive.
                // See returnFromCheckout() below.
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

        // An external (non-Inertia) URL — Inertia::location() is the
        // documented way to send the browser to it; a plain redirect()
        // would be followed as an XHR by Inertia's client and never
        // actually navigate the browser there.
        return Inertia::location($attached['redirect_url']);
    }

    /**
     * Where PayMongo sends the customer after they authorise (or abandon)
     * the GCash page. Confirms the payment immediately instead of waiting
     * for the webhook.
     *
     * WHY THIS EXISTS: the webhook alone is not enough. PayMongo's servers
     * POST it to a public URL, so on a local `php artisan serve` (or any
     * environment PayMongo can't reach) it never arrives and a genuinely
     * paid order sits on awaiting_payment forever — which is exactly what
     * happened. This is not a workaround for the webhook; the two are the
     * standard pair. The webhook is the reliable one (it still fires if the
     * customer closes the tab at PayMongo); this one is the immediate one
     * (the customer sees the right status the instant they land back).
     *
     * Trust rules, in order:
     *   1. The order must belong to the signed-in customer.
     *   2. The intent id in the query string is only ever COMPARED against
     *      the one this order already stored at create() time — never used
     *      to look an order up, and never trusted as proof of anything.
     *      Otherwise anyone could append a stranger's succeeded intent id.
     *   3. Whether it actually got paid is asked of PayMongo's API. The
     *      browser's URL is a hint that something happened, nothing more.
     *
     * Idempotent with the webhook by construction: both funnel into
     * InventoryService::commitForPaidOrder(), whose stockIsCommitted() guard
     * means whichever arrives second is a no-op. Stock decrements once.
     */
    public function returnFromCheckout(
        Request $request,
        string $orderNumber,
        PayMongoClient $paymongo,
        InventoryService $inventory
    ): RedirectResponse {
        $order = Order::query()
            ->where('order_number', $orderNumber)
            ->with('items')
            ->firstOrFail();

        abort_unless($order->user_id === $request->user()->id, 403);

        $to = redirect()->route('orders.show', $order->order_number);

        // Already settled — most likely the webhook won the race, which is
        // a success, not an error. Say nothing and show the order.
        if ($order->stockIsCommitted()) {
            return $to;
        }

        $intentId = $order->paymongo_payment_intent_id;

        if (! $intentId || $request->query('payment_intent_id') !== $intentId) {
            // Landed here without a payment this order ever started. Not
            // worth an error message — the order page already shows the
            // real status and the pay button.
            return $to;
        }

        try {
            $intent = $paymongo->getPaymentIntent($intentId);
        } catch (RuntimeException $e) {
            report($e);

            return $to->withErrors([
                'payment' => 'We could not confirm your payment with PayMongo just now. '
                    .'If money left your account it will still be applied — refresh in a moment.',
            ]);
        }

        if ($intent['status'] !== 'succeeded') {
            // Authorisation abandoned, expired, or failed. The order is
            // untouched and still payable.
            return $to->withErrors([
                'payment' => 'That payment was not completed, so nothing was charged. You can try again.',
            ]);
        }

        try {
            $inventory->commitForPaidOrder($order, array_filter([
                'payment_intent_id' => $intentId,
                'payment_id' => $intent['payment_id'],
            ]), $order->paidStatusForPaymentMethod());
        } catch (InsufficientStockException $e) {
            // Money moved but the stock went while they were paying — the
            // race CheckoutController accepts by not reserving. Reported so
            // a paid-but-unfulfillable order can't pass unnoticed.
            report($e);

            return $to->withErrors([
                'payment' => 'Your payment went through, but an item sold out while you were paying. '
                    .'Please contact us and we will sort it out.',
            ]);
        }

        return $to->with('success', 'Payment confirmed. Thank you!');
    }
}
