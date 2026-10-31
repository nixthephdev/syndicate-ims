<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Notifications\OrderUpdated;
use App\Notifications\ShopAlert;
use App\Services\PayMongoClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

/**
 * The remaining 50% of a deposit order, by GCash (client, 2026-10-31: no
 * cash at pickup). A second PayMongo payment on the same order, with its own
 * intent — see the add_balance_payment migration.
 *
 * Same trust rules as PayMongoController, deliberately: create() only sends
 * the customer to PayMongo; returnFromCheckout() compares the browser's
 * intent id against the stored one and then ASKS PayMongo whether it
 * succeeded. Nothing here touches stock — that was committed with the
 * deposit — so settling is just deposit_paid -> paid.
 */
class BalancePaymentController extends Controller
{
    public function create(Request $request, string $orderNumber, PayMongoClient $paymongo): Response
    {
        $order = $this->ownedOrder($request, $orderNumber);

        if (! $order->canPayBalanceOnline()) {
            return back()->withErrors(['payment' => 'There is no balance to pay on this order.']);
        }

        try {
            // Paid on a previous attempt but the tab closed before coming
            // back? Settle it rather than charge the balance twice.
            if ($order->balance_payment_intent_id) {
                $previous = $paymongo->getPaymentIntent($order->balance_payment_intent_id);

                if ($previous['status'] === 'succeeded') {
                    return $this->settle($order, $previous);
                }
            }

            $intent = $paymongo->createPaymentIntent(
                (int) $order->balanceCentavos(),
                'Syndicate Supply Co. order '.$order->order_number.' — remaining balance'
            );

            $order->forceFill(['balance_payment_intent_id' => $intent['id']])->save();

            $attached = $paymongo->attachPaymentMethod(
                $intent['id'],
                $paymongo->createGcashPaymentMethod()['id'],
                $intent['client_key'],
                route('payment.balance.return', $order->order_number)
            );
        } catch (RuntimeException $e) {
            report($e);

            return back()->withErrors([
                'payment' => 'Could not start payment with PayMongo. Nothing was charged. Try again in a moment.',
            ]);
        }

        if (! $attached['redirect_url']) {
            return back()->withErrors(['payment' => 'PayMongo did not return a checkout page. Nothing was charged.']);
        }

        return Inertia::location($attached['redirect_url']);
    }

    public function returnFromCheckout(Request $request, string $orderNumber, PayMongoClient $paymongo): RedirectResponse
    {
        $order = $this->ownedOrder($request, $orderNumber);
        $to = redirect()->route('orders.show', $order->order_number);

        $intentId = $order->balance_payment_intent_id;

        if ($order->status !== Order::STATUS_DEPOSIT_PAID
            || ! $intentId
            || $request->query('payment_intent_id') !== $intentId) {
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
            return $to->withErrors(['payment' => 'That payment was not completed, so nothing was charged. You can try again.']);
        }

        return $this->settle($order, $intent);
    }

    /** @param  array{payment_id: ?string}  $intent  A SUCCEEDED intent. */
    private function settle(Order $order, array $intent): RedirectResponse
    {
        $settledNow = DB::transaction(function () use ($order, $intent) {
            // Locked re-read: a reload of the return page racing a second
            // press of Pay must settle once.
            $locked = Order::query()->whereKey($order->getKey())->lockForUpdate()->firstOrFail();

            if ($locked->status !== Order::STATUS_DEPOSIT_PAID) {
                return false;
            }

            $locked->forceFill([
                'status' => Order::STATUS_PAID,
                'balance_payment_id' => $intent['payment_id'],
                'balance_paid_at' => now(),
            ])->save();

            return true;
        });

        if ($settledNow) {
            ShopAlert::toTeam(ShopAlert::balancePaid($order->fresh()));
            $order->user?->notify(new OrderUpdated($order, 'Balance received — your order is fully paid.'));
        }

        return redirect()->route('orders.show', $order->order_number)
            ->with('success', 'Balance paid. Your order is fully paid — thank you!');
    }

    private function ownedOrder(Request $request, string $orderNumber): Order
    {
        $order = Order::query()->where('order_number', $orderNumber)->firstOrFail();

        abort_unless($order->user_id === $request->user()->id, 403);

        return $order;
    }
}
