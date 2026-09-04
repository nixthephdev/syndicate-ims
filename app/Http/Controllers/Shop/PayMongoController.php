<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\PayMongoClient;
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
 * This controller only ever gets the customer to PayMongo's checkout page.
 * It does NOT mark the order paid — only the webhook
 * (Webhooks\PayMongoWebhookController) does that, because only the webhook
 * is something a customer can't forge by just visiting a URL.
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

        try {
            $intent = $paymongo->createPaymentIntent(
                $order->total_centavos,
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
                route('orders.show', $order->order_number)
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
}
