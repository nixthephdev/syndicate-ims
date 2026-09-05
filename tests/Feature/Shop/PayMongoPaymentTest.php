<?php

namespace Tests\Feature\Shop;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\PayMongoWebhookVerifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\Concerns\CompletesCheckoutOtp;
use Tests\TestCase;

/**
 * The real PayMongo path — PayMongoController::create() (starts a payment,
 * never completes one) and PayMongoWebhookController::handle() (the only
 * thing that actually marks an order paid). Every PayMongo API call is
 * Http::fake()'d against the exact shapes confirmed from PayMongo's own
 * docs (see PayMongoClient's docblock) — this project has no live test
 * keys to hit the real sandbox with, so this is what "tested" means here
 * until real keys exist.
 */
class PayMongoPaymentTest extends TestCase
{
    use CompletesCheckoutOtp;
    use RefreshDatabase;

    private const WEBHOOK_SECRET = 'whsec_test_secret';

    private function orderAwaitingPayment(User $user, int $stock = 10): Order
    {
        Mail::fake();

        $product = Product::factory()->create([
            'is_active' => true,
            'base_price_centavos' => 50000,
        ]);

        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'size' => 'M',
            'color' => 'Black',
            'stock' => $stock,
            'price_centavos' => null,
            'is_active' => true,
        ]);

        $this->actingAs($user);
        $this->post(route('cart.store'), [
            'type' => 'variant',
            'id' => $variant->id,
            'quantity' => 1,
        ]);
        $this->post(route('checkout.store'), [
            'customer_name' => 'Juan Dela Cruz',
            'customer_email' => 'juan@example.test',
            'customer_phone' => '0917 123 4567',
        ]);
        $this->completeCheckoutOtp();

        return Order::firstOrFail();
    }

    private function cashOrderAwaitingPayment(User $user, int $stock = 10): Order
    {
        $order = $this->orderAwaitingPayment($user, $stock);
        $order->update(['payment_method' => Order::PAYMENT_METHOD_CASH]);

        return $order;
    }

    private function deliveryOrderAwaitingDeposit(User $user, int $stock = 10): Order
    {
        Mail::fake();

        $product = Product::factory()->create([
            'is_active' => true,
            'base_price_centavos' => 50000,
        ]);

        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'size' => 'M',
            'color' => 'Black',
            'stock' => $stock,
            'price_centavos' => null,
            'is_active' => true,
        ]);

        $this->actingAs($user);
        $this->post(route('cart.store'), [
            'type' => 'variant',
            'id' => $variant->id,
            'quantity' => 1,
        ]);
        $this->post(route('checkout.store'), [
            'customer_name' => 'Juan Dela Cruz',
            'customer_email' => 'juan@example.test',
            'customer_phone' => '0917 123 4567',
            'fulfillment_method' => Order::FULFILLMENT_DELIVERY,
            'address_line' => '123 Rizal St.',
            'barangay' => 'Tagas',
            'city' => 'Daraga',
            'province' => 'Albay',
        ]);
        $this->completeCheckoutOtp();

        return Order::firstOrFail();
    }

    private function fakePayMongoSuccess(): void
    {
        Http::fake([
            'api.paymongo.com/v1/payment_intents/*' => Http::response([
                'data' => [
                    'id' => 'pi_test123',
                    'type' => 'payment_intent',
                    'attributes' => [
                        'status' => 'awaiting_next_action',
                        'next_action' => [
                            'redirect' => ['url' => 'https://test-checkout.paymongo.com/pi_test123'],
                        ],
                    ],
                ],
            ], 200),
            'api.paymongo.com/v1/payment_intents' => Http::response([
                'data' => [
                    'id' => 'pi_test123',
                    'type' => 'payment_intent',
                    'attributes' => ['client_key' => 'pi_test123_client_key'],
                ],
            ], 200),
            'api.paymongo.com/v1/payment_methods' => Http::response([
                'data' => [
                    'id' => 'pm_test123',
                    'type' => 'payment_method',
                    'attributes' => ['type' => 'gcash'],
                ],
            ], 200),
        ]);
    }

    public function test_starting_payment_saves_the_intent_id_and_redirects_to_checkout(): void
    {
        config(['services.paymongo.secret_key' => 'sk_test_fake']);
        $this->fakePayMongoSuccess();

        $user = User::factory()->create();
        $order = $this->orderAwaitingPayment($user);

        $response = $this->withHeaders(['X-Inertia' => 'true'])
            ->post(route('payment.paymongo.create', $order->order_number));

        // Inertia::location() for an Inertia request: 409 + the redirect
        // target in a header, not a normal 302 — the frontend's Inertia
        // client is what turns that into an actual browser navigation.
        $response->assertStatus(409);
        $this->assertSame(
            'https://test-checkout.paymongo.com/pi_test123',
            $response->headers->get('X-Inertia-Location')
        );

        $this->assertSame('pi_test123', $order->fresh()->paymongo_payment_intent_id);
        // Starting a payment must never itself mark the order paid — only
        // the webhook does that.
        $this->assertSame(Order::STATUS_AWAITING_PAYMENT, $order->fresh()->status);
    }

    public function test_a_customer_cannot_start_payment_on_someone_elses_order(): void
    {
        config(['services.paymongo.secret_key' => 'sk_test_fake']);
        $owner = User::factory()->create();
        $order = $this->orderAwaitingPayment($owner);

        $this->actingAs(User::factory()->create())
            ->post(route('payment.paymongo.create', $order->order_number))
            ->assertForbidden();
    }

    public function test_a_paid_orders_payment_cannot_be_restarted(): void
    {
        config(['services.paymongo.secret_key' => 'sk_test_fake']);
        $user = User::factory()->create();
        $order = $this->orderAwaitingPayment($user);
        $order->update(['status' => Order::STATUS_PAID, 'paid_at' => now()]);

        $this->actingAs($user)
            ->post(route('payment.paymongo.create', $order->order_number))
            ->assertSessionHasErrors('payment');
    }

    public function test_a_paymongo_api_failure_does_not_touch_the_order(): void
    {
        config(['services.paymongo.secret_key' => 'sk_test_fake']);
        Http::fake([
            'api.paymongo.com/*' => Http::response(['errors' => [['detail' => 'Invalid API key']]], 401),
        ]);

        $user = User::factory()->create();
        $order = $this->orderAwaitingPayment($user);

        $this->actingAs($user)
            ->post(route('payment.paymongo.create', $order->order_number))
            ->assertSessionHasErrors('payment');

        $this->assertSame(Order::STATUS_AWAITING_PAYMENT, $order->fresh()->status);
    }

    private function webhookHeader(string $body, string $secret): string
    {
        $timestamp = time();
        $computed = hash_hmac('sha256', $timestamp.'.'.$body, $secret);

        return "t={$timestamp},te={$computed},li=irrelevant";
    }

    /**
     * Shape confirmed against a REAL completed test payment retrieved from
     * PayMongo's API (2026-09-05) — data.attributes.data is a Payment
     * resource (pay_...) whose own attributes.payment_intent_id field
     * carries the parent intent's id. payment_intent.succeeded isn't even
     * selectable in this PayMongo account's webhook UI, so payment.paid is
     * the real event the controller has to handle.
     */
    private function paymentPaidPayload(string $intentId): string
    {
        return json_encode([
            'data' => [
                'id' => 'evt_test123',
                'type' => 'event',
                'attributes' => [
                    'type' => 'payment.paid',
                    'livemode' => false,
                    'data' => [
                        'id' => 'pay_test123',
                        'type' => 'payment',
                        'attributes' => [
                            'status' => 'paid',
                            'amount' => 10000,
                            'payment_intent_id' => $intentId,
                        ],
                    ],
                ],
            ],
        ]);
    }

    public function test_a_correctly_signed_webhook_marks_the_order_paid_and_decrements_stock(): void
    {
        config(['services.paymongo.webhook_secret' => self::WEBHOOK_SECRET]);
        $user = User::factory()->create();
        $order = $this->orderAwaitingPayment($user, 10);
        $order->update(['paymongo_payment_intent_id' => 'pi_test123']);
        $variant = $order->items()->firstOrFail()->purchasable;

        $body = $this->paymentPaidPayload('pi_test123');

        $this->call(
            'POST',
            route('webhooks.paymongo'),
            [],
            [],
            [],
            ['HTTP_Paymongo-Signature' => $this->webhookHeader($body, self::WEBHOOK_SECRET), 'CONTENT_TYPE' => 'application/json'],
            $body
        )->assertOk();

        $order->refresh();
        $this->assertSame(Order::STATUS_PAID, $order->status);
        $this->assertNotNull($order->paid_at);
        $this->assertSame(9, $variant->fresh()->stock);
    }

    public function test_an_unsigned_webhook_is_rejected(): void
    {
        config(['services.paymongo.webhook_secret' => self::WEBHOOK_SECRET]);
        $user = User::factory()->create();
        $order = $this->orderAwaitingPayment($user);
        $order->update(['paymongo_payment_intent_id' => 'pi_test123']);

        $body = $this->paymentPaidPayload('pi_test123');

        $this->call('POST', route('webhooks.paymongo'), [], [], [], [], $body)
            ->assertStatus(400);

        $this->assertSame(Order::STATUS_AWAITING_PAYMENT, $order->fresh()->status);
    }

    public function test_a_webhook_signed_with_the_wrong_secret_is_rejected(): void
    {
        config(['services.paymongo.webhook_secret' => self::WEBHOOK_SECRET]);
        $user = User::factory()->create();
        $order = $this->orderAwaitingPayment($user);
        $order->update(['paymongo_payment_intent_id' => 'pi_test123']);

        $body = $this->paymentPaidPayload('pi_test123');

        $this->call(
            'POST',
            route('webhooks.paymongo'),
            [],
            [],
            [],
            ['HTTP_Paymongo-Signature' => $this->webhookHeader($body, 'whsec_totally_wrong')],
            $body
        )->assertStatus(400);

        $this->assertSame(Order::STATUS_AWAITING_PAYMENT, $order->fresh()->status);
    }

    public function test_an_unrelated_event_type_is_acknowledged_but_ignored(): void
    {
        config(['services.paymongo.webhook_secret' => self::WEBHOOK_SECRET]);
        $user = User::factory()->create();
        $order = $this->orderAwaitingPayment($user);
        $order->update(['paymongo_payment_intent_id' => 'pi_test123']);

        $body = json_encode([
            'data' => [
                'id' => 'evt_test999',
                'type' => 'event',
                'attributes' => [
                    'type' => 'payment.failed',
                    'data' => [
                        'id' => 'pay_test999',
                        'type' => 'payment',
                        'attributes' => ['status' => 'failed', 'payment_intent_id' => 'pi_test123'],
                    ],
                ],
            ],
        ]);

        $this->call(
            'POST',
            route('webhooks.paymongo'),
            [],
            [],
            [],
            ['HTTP_Paymongo-Signature' => $this->webhookHeader($body, self::WEBHOOK_SECRET), 'CONTENT_TYPE' => 'application/json'],
            $body
        )->assertOk();

        $this->assertSame(Order::STATUS_AWAITING_PAYMENT, $order->fresh()->status);
    }

    public function test_a_webhook_for_an_unknown_intent_id_is_acknowledged_but_ignored(): void
    {
        config(['services.paymongo.webhook_secret' => self::WEBHOOK_SECRET]);
        $user = User::factory()->create();
        $order = $this->orderAwaitingPayment($user);
        $order->update(['paymongo_payment_intent_id' => 'pi_real_one']);

        // A webhook arrives for a payment intent this app never created.
        $body = $this->paymentPaidPayload('pi_someone_elses_intent');

        $this->call(
            'POST',
            route('webhooks.paymongo'),
            [],
            [],
            [],
            ['HTTP_Paymongo-Signature' => $this->webhookHeader($body, self::WEBHOOK_SECRET), 'CONTENT_TYPE' => 'application/json'],
            $body
        )->assertOk();

        $this->assertSame(Order::STATUS_AWAITING_PAYMENT, $order->fresh()->status);
    }

    public function test_a_repeated_webhook_for_an_already_paid_order_is_idempotent(): void
    {
        config(['services.paymongo.webhook_secret' => self::WEBHOOK_SECRET]);
        $user = User::factory()->create();
        $order = $this->orderAwaitingPayment($user, 10);
        $order->update(['paymongo_payment_intent_id' => 'pi_test123']);
        $variant = $order->items()->firstOrFail()->purchasable;

        $body = $this->paymentPaidPayload('pi_test123');
        $header = [
            'HTTP_Paymongo-Signature' => $this->webhookHeader($body, self::WEBHOOK_SECRET),
            'CONTENT_TYPE' => 'application/json',
        ];

        $this->call('POST', route('webhooks.paymongo'), [], [], [], $header, $body)->assertOk();
        $this->call('POST', route('webhooks.paymongo'), [], [], [], $header, $body)->assertOk();

        $this->assertSame(9, $variant->fresh()->stock);
    }

    public function test_a_cash_order_cannot_start_a_gcash_payment(): void
    {
        config(['services.paymongo.secret_key' => 'sk_test_fake']);
        $user = User::factory()->create();
        $order = $this->cashOrderAwaitingPayment($user);

        $this->actingAs($user)
            ->post(route('payment.paymongo.create', $order->order_number))
            ->assertSessionHasErrors('payment');

        $this->assertSame(Order::STATUS_AWAITING_PAYMENT, $order->fresh()->status);
    }

    /**
     * A delivery order only ever charges the 50% deposit here — the
     * remaining balance is cash, collected on delivery, never a second
     * online charge.
     */
    public function test_starting_payment_for_a_delivery_order_charges_only_the_deposit(): void
    {
        config(['services.paymongo.secret_key' => 'sk_test_fake']);
        $this->fakePayMongoSuccess();

        $user = User::factory()->create();
        $order = $this->deliveryOrderAwaitingDeposit($user);

        $this->assertSame(25000, $order->deposit_centavos);
        $this->assertSame(50000, $order->total_centavos);

        $this->withHeaders(['X-Inertia' => 'true'])
            ->post(route('payment.paymongo.create', $order->order_number));

        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'payment_intents')
                && ! str_contains($request->url(), 'attach')
                && ($request['data']['attributes']['amount'] ?? null) === 25000;
        });
    }

    public function test_a_correctly_signed_webhook_marks_a_delivery_order_deposit_paid_and_commits_full_stock(): void
    {
        config(['services.paymongo.webhook_secret' => self::WEBHOOK_SECRET]);
        $user = User::factory()->create();
        $order = $this->deliveryOrderAwaitingDeposit($user, 10);
        $order->update(['paymongo_payment_intent_id' => 'pi_test123']);
        $variant = $order->items()->firstOrFail()->purchasable;

        $body = $this->paymentPaidPayload('pi_test123');

        $this->call(
            'POST',
            route('webhooks.paymongo'),
            [],
            [],
            [],
            ['HTTP_Paymongo-Signature' => $this->webhookHeader($body, self::WEBHOOK_SECRET), 'CONTENT_TYPE' => 'application/json'],
            $body
        )->assertOk();

        $order->refresh();
        $this->assertSame(Order::STATUS_DEPOSIT_PAID, $order->status);
        $this->assertNotNull($order->paid_at);
        // The deposit only covers half the money, but the whole item is
        // reserved — the deposit secures full stock, not half of it.
        $this->assertSame(9, $variant->fresh()->stock);
    }
}
