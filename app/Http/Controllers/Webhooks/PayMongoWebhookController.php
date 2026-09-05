<?php

namespace App\Http\Controllers\Webhooks;

use App\Exceptions\InsufficientStockException;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\InventoryService;
use App\Services\PayMongoWebhookVerifier;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Where a REAL payment actually gets marked paid — PayMongo calls this,
 * a customer's browser never does. That distinction is the whole reason
 * this exists as a separate route from PayMongoController::create(): a
 * customer can forge a request to any URL their browser can reach, but
 * they cannot forge PayMongo's signature on this one (see
 * PayMongoWebhookVerifier). This is the seam Shop\PaymentController's
 * docblock has pointed at since Phase 4.
 *
 * No auth middleware, no CSRF (see VerifyCsrfToken's $except) — PayMongo's
 * servers aren't a logged-in browser and don't carry a CSRF token or
 * session cookie. The signature check is what stands in for both.
 */
class PayMongoWebhookController extends Controller
{
    public function handle(Request $request, PayMongoWebhookVerifier $verifier, InventoryService $inventory): Response
    {
        $verified = $verifier->verify(
            $request->getContent(),
            $request->header('Paymongo-Signature'),
            app()->environment('production')
        );

        abort_unless($verified, 400, 'Invalid signature.');

        $event = $request->input('data.attributes.type');

        // payment.paid — the only payment-succeeded event this PayMongo
        // account's webhook UI actually offers (payment_intent.succeeded
        // isn't selectable there, despite being in PayMongo's general docs).
        // data.attributes.data is a Payment resource (pay_...), NOT the
        // payment intent — but its attributes.payment_intent_id field
        // carries the intent id (pi_...) directly. This was confirmed by
        // retrieving a real completed payment from the API and reading the
        // actual field back, not assumed from docs — PayMongo's own docs
        // pages for this were returning empty schemas at the time this was
        // built.
        if ($event !== 'payment.paid') {
            return response('', 200);
        }

        $paymentIntentId = $request->input('data.attributes.data.attributes.payment_intent_id');

        if (! $paymentIntentId) {
            return response('', 200);
        }

        $order = Order::query()
            ->where('paymongo_payment_intent_id', $paymentIntentId)
            ->with('items')
            ->first();

        if (! $order) {
            // Not this app's order (or a stale/duplicate intent id) — 200
            // so PayMongo doesn't retry something that will never resolve.
            return response('', 200);
        }

        try {
            $inventory->commitForPaidOrder($order, [
                'payment_intent_id' => $paymentIntentId,
            ], $order->paidStatusForPaymentMethod());
        } catch (InsufficientStockException $e) {
            // The order stays awaiting_payment. This is the same race
            // CheckoutController already accepts by not reserving stock —
            // here it just surfaces via a real PayMongo payment instead of
            // the local stub. Logged so a real oversold-and-paid case
            // (customer's money moved, stock didn't) doesn't go unnoticed.
            report($e);
        }

        return response('', 200);
    }
}
