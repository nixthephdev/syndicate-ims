<?php

namespace Tests\Feature\Shop;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\Concerns\CompletesCheckoutOtp;
use Tests\TestCase;

/**
 * PayMongoController::returnFromCheckout() — the second thing that can
 * confirm a payment, for when PayMongo cannot reach this app to deliver a
 * webhook (a local `artisan serve`, most obviously, which is exactly how a
 * genuinely-paid order was found stuck on awaiting_payment).
 *
 * The rules worth pinning are the trust ones: the query string is only ever
 * compared against what the order already stored, the real answer comes from
 * PayMongo's API, and running twice must not decrement stock twice.
 */
class PayMongoReturnTest extends TestCase
{
    use CompletesCheckoutOtp;
    use RefreshDatabase;

    private function orderAwaitingPayment(User $user, array $checkout = [], int $stock = 10): Order
    {
        Mail::fake();

        $variant = ProductVariant::factory()->create([
            'product_id' => Product::factory()->create([
                'is_active' => true,
                'base_price_centavos' => 50000,
            ])->id,
            'size' => 'M',
            'color' => 'Black',
            'stock' => $stock,
            'price_centavos' => null,
            'is_active' => true,
        ]);

        $this->actingAs($user);
        $this->post(route('cart.store'), ['type' => 'variant', 'id' => $variant->id, 'quantity' => 1]);
        $this->post(route('checkout.store'), array_merge([
            'customer_name' => 'Juan Dela Cruz',
            'customer_email' => 'juan@example.test',
            'customer_phone' => '0917 123 4567',
        ], $checkout));
        $this->completeCheckoutOtp();

        $order = Order::firstOrFail();
        $order->forceFill(['paymongo_payment_intent_id' => 'pi_test123'])->save();

        return $order;
    }

    /** The shape confirmed from a real completed PayMongo test payment. */
    private function fakeIntent(string $status = 'succeeded'): void
    {
        Http::fake([
            'api.paymongo.com/v1/payment_intents/*' => Http::response([
                'data' => [
                    'id' => 'pi_test123',
                    'attributes' => [
                        'status' => $status,
                        'amount' => 50000,
                        'payments' => [['id' => 'pay_test999']],
                    ],
                ],
            ], 200),
        ]);
    }

    private function returnTo(Order $order, ?string $intentId = 'pi_test123')
    {
        return $this->get(route('payment.paymongo.return', $order->order_number)
            .($intentId === null ? '' : '?payment_intent_id='.$intentId));
    }

    public function test_a_succeeded_intent_marks_the_order_paid_and_moves_stock(): void
    {
        $user = User::factory()->create();
        $order = $this->orderAwaitingPayment($user);
        $variant = ProductVariant::firstOrFail();
        $this->fakeIntent();

        $this->returnTo($order)->assertRedirect(route('orders.show', $order->order_number));

        $order->refresh();
        $this->assertSame(Order::STATUS_PAID, $order->status);
        $this->assertNotNull($order->paid_at);
        $this->assertSame('pay_test999', $order->paymongo_payment_id);
        $this->assertSame(9, $variant->fresh()->stock);
    }

    /**
     * The whole reason deposits exist as a separate status: a delivery
     * order's GCash leg is only the 50%, so it must not land on `paid`.
     */
    public function test_a_delivery_deposit_lands_on_deposit_paid_not_paid(): void
    {
        $user = User::factory()->create();
        $order = $this->orderAwaitingPayment($user, [
            'fulfillment_method' => Order::FULFILLMENT_DELIVERY,
            'address_line' => '123 Rizal St.',
            'barangay' => 'Tagas',
            'city' => 'Daraga',
            'province' => 'Albay',
        ]);
        $this->fakeIntent();

        $this->returnTo($order);

        $this->assertSame(Order::STATUS_DEPOSIT_PAID, $order->fresh()->status);
    }

    public function test_an_unsucceeded_intent_leaves_the_order_alone(): void
    {
        $user = User::factory()->create();
        $order = $this->orderAwaitingPayment($user);
        $variant = ProductVariant::firstOrFail();
        $this->fakeIntent('awaiting_payment_method');

        $this->returnTo($order)->assertSessionHasErrors('payment');

        $this->assertSame(Order::STATUS_AWAITING_PAYMENT, $order->fresh()->status);
        $this->assertSame(10, $variant->fresh()->stock);
    }

    /**
     * The important one. A succeeded intent id belonging to somebody else's
     * order must not confirm THIS order just because it's in the URL — the
     * param is only ever compared against what this order already stored.
     */
    public function test_a_foreign_intent_id_in_the_url_confirms_nothing(): void
    {
        $user = User::factory()->create();
        $order = $this->orderAwaitingPayment($user);
        $this->fakeIntent();

        $this->returnTo($order, 'pi_someone_elses_succeeded_intent');

        $this->assertSame(Order::STATUS_AWAITING_PAYMENT, $order->fresh()->status);
        // Never even asked PayMongo — the mismatch is caught before that.
        Http::assertNothingSent();
    }

    public function test_returning_with_no_intent_id_is_harmless(): void
    {
        $user = User::factory()->create();
        $order = $this->orderAwaitingPayment($user);
        $this->fakeIntent();

        $this->returnTo($order, null)->assertRedirect(route('orders.show', $order->order_number));

        $this->assertSame(Order::STATUS_AWAITING_PAYMENT, $order->fresh()->status);
    }

    public function test_another_customer_cannot_use_this_route(): void
    {
        $owner = User::factory()->create();
        $order = $this->orderAwaitingPayment($owner);
        $this->fakeIntent();

        $this->actingAs(User::factory()->create());
        $this->returnTo($order)->assertForbidden();

        $this->assertSame(Order::STATUS_AWAITING_PAYMENT, $order->fresh()->status);
    }

    /**
     * The webhook and this route can both land on the same payment. Whoever
     * is second must be a no-op — stock decrements exactly once.
     */
    public function test_running_twice_does_not_decrement_stock_twice(): void
    {
        $user = User::factory()->create();
        $order = $this->orderAwaitingPayment($user);
        $variant = ProductVariant::firstOrFail();
        $this->fakeIntent();

        $this->returnTo($order);
        $this->returnTo($order);

        $this->assertSame(9, $variant->fresh()->stock);
        $this->assertSame(Order::STATUS_PAID, $order->fresh()->status);
    }

    public function test_a_paymongo_api_failure_leaves_the_order_untouched(): void
    {
        $user = User::factory()->create();
        $order = $this->orderAwaitingPayment($user);
        $variant = ProductVariant::firstOrFail();

        Http::fake([
            'api.paymongo.com/v1/payment_intents/*' => Http::response(
                ['errors' => [['detail' => 'Service unavailable']]],
                503
            ),
        ]);

        $this->returnTo($order)->assertSessionHasErrors('payment');

        $this->assertSame(Order::STATUS_AWAITING_PAYMENT, $order->fresh()->status);
        $this->assertSame(10, $variant->fresh()->stock);
    }
}
