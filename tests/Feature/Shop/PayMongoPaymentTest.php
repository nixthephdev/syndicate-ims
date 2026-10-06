<?php

namespace Tests\Feature\Shop;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CompletesCheckoutOtp;
use Tests\TestCase;

/**
 * PayMongoController::create() — starts a GCash payment, never completes
 * one. Response shapes are the ones confirmed against PayMongo's real test
 * API when this integration was first built (see PayMongoClient).
 */
class PayMongoPaymentTest extends TestCase
{
    use CompletesCheckoutOtp;
    use RefreshDatabase;

    private const CHECKOUT_URL = 'https://test-checkout.paymongo.com/pi_test123';

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.paymongo.secret_key' => 'sk_test_fake']);
    }

    private function order(User $user, array $checkout = []): Order
    {
        Mail::fake();

        $variant = ProductVariant::factory()->create([
            'product_id' => Product::factory()->create(['is_active' => true, 'base_price_centavos' => 50000])->id,
            'size' => 'M',
            'color' => 'Black',
            'stock' => 10,
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

        return Order::firstOrFail();
    }

    private function fakeStart(): void
    {
        Http::fake([
            'api.paymongo.com/v1/payment_intents/*/attach' => Http::response(['data' => [
                'id' => 'pi_test123',
                'attributes' => [
                    'status' => 'awaiting_next_action',
                    'next_action' => ['redirect' => ['url' => self::CHECKOUT_URL]],
                ],
            ]]),
            'api.paymongo.com/v1/payment_intents' => Http::response(['data' => [
                'id' => 'pi_test123',
                'attributes' => ['client_key' => 'pi_test123_client_key'],
            ]]),
            'api.paymongo.com/v1/payment_methods' => Http::response(['data' => [
                'id' => 'pm_test123',
                'attributes' => ['type' => 'gcash'],
            ]]),
        ]);
    }

    private function pay(Order $order)
    {
        return $this->post(route('payment.paymongo.create', $order->order_number));
    }

    private function createdIntentAmount(): ?int
    {
        $sent = Http::recorded(fn (Request $r) => $r->method() === 'POST'
            && str_ends_with($r->url(), '/payment_intents'));

        return $sent->isEmpty() ? null : $sent->first()[0]['data']['attributes']['amount'];
    }

    public function test_paying_sends_the_customer_to_paymongo_and_marks_nothing_paid(): void
    {
        $order = $this->order(User::factory()->create());
        $this->fakeStart();

        $this->pay($order)->assertRedirect(self::CHECKOUT_URL);

        $order->refresh();
        $this->assertSame('pi_test123', $order->paymongo_payment_intent_id);
        $this->assertSame(Order::STATUS_AWAITING_PAYMENT, $order->status);
        $this->assertNull($order->paid_at);
        $this->assertSame(50000, $this->createdIntentAmount());
    }

    public function test_a_delivery_order_is_only_charged_its_deposit(): void
    {
        $order = $this->order(User::factory()->create(), [
            'fulfillment_method' => Order::FULFILLMENT_DELIVERY,
            'address_line' => '123 Rizal St.',
            'barangay' => 'Tagas',
            'city' => 'Daraga',
            'province' => 'Albay',
        ]);
        $this->fakeStart();

        $this->pay($order);

        $this->assertSame(25000, $this->createdIntentAmount());
    }

    public function test_a_cash_order_cannot_be_paid_online(): void
    {
        $order = $this->order(User::factory()->create(), ['payment_method' => 'cash']);
        Http::fake();

        $this->pay($order)->assertSessionHasErrors('payment');

        Http::assertNothingSent();
    }

    public function test_another_customer_cannot_start_a_payment(): void
    {
        $order = $this->order(User::factory()->create());
        Http::fake();

        $this->actingAs(User::factory()->create());
        $this->pay($order)->assertForbidden();

        Http::assertNothingSent();
    }

    public function test_a_paymongo_failure_leaves_the_order_payable(): void
    {
        $order = $this->order(User::factory()->create());
        Http::fake(['*' => Http::response(['errors' => [['detail' => 'boom']]], 500)]);

        $this->pay($order)->assertSessionHasErrors('payment');

        $this->assertSame(Order::STATUS_AWAITING_PAYMENT, $order->fresh()->status);
    }

    /**
     * Paid, but closed the tab before PayMongo sent them back. Pressing Pay
     * again must settle the order from the intent it already has — not
     * open a second GCash charge.
     */
    public function test_paying_again_after_a_completed_payment_settles_instead_of_charging_twice(): void
    {
        $order = $this->order(User::factory()->create());
        $order->forceFill(['paymongo_payment_intent_id' => 'pi_old'])->save();

        Http::fake([
            'api.paymongo.com/v1/payment_intents/pi_old' => Http::response(['data' => [
                'id' => 'pi_old',
                'attributes' => ['status' => 'succeeded', 'amount' => 50000, 'payments' => [['id' => 'pay_old']]],
            ]]),
        ]);

        $this->pay($order)->assertRedirect(route('orders.show', $order->order_number));

        $order->refresh();
        $this->assertSame(Order::STATUS_PAID, $order->status);
        $this->assertSame('pay_old', $order->paymongo_payment_id);
        $this->assertNull($this->createdIntentAmount());
        $this->assertSame(9, ProductVariant::firstOrFail()->stock);
    }
}
