<?php

namespace Tests\Feature\Shop;

use App\Exceptions\InsufficientStockException;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\SkateboardComponent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\Concerns\CompletesCheckoutOtp;
use Tests\Concerns\ConfirmsPayment;
use Tests\TestCase;

/**
 * The path objective 3 rests on: cart -> order -> payment confirmed -> stock
 * decremented, atomically and exactly once.
 *
 * checkout.store no longer creates the order directly — it stashes the
 * validated form and emails an OTP; completeCheckoutOtp() (see
 * Tests\Concerns\CompletesCheckoutOtp) is what actually finishes it. Mail
 * is faked class-wide since virtually every test here goes through that.
 */
class CheckoutTest extends TestCase
{
    use CompletesCheckoutOtp;
    use ConfirmsPayment;
    use RefreshDatabase;

    /** A real PSGC address — the main branch's own barangay. */
    private const ADDRESS = [
        'address_line' => 'Purok 1',
        'barangay' => 'Tagas',
        'city' => 'Daraga',
        'province' => 'Albay',
        'postal_code' => '4501',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

    private function variantWithStock(int $stock, int $price = 50000): ProductVariant
    {
        $product = Product::factory()->create([
            'is_active' => true,
            'base_price_centavos' => $price,
        ]);

        return ProductVariant::factory()->create([
            'product_id' => $product->id,
            'size' => 'M',
            'color' => 'Black',
            'stock' => $stock,
            'price_centavos' => null, // inherits the product's base price
            'is_active' => true,
        ]);
    }

    private function fill(ProductVariant $variant, int $quantity = 1): void
    {
        $this->post(route('cart.store'), [
            'type' => 'variant',
            'id' => $variant->id,
            'quantity' => $quantity,
        ]);
    }

    private function details(array $overrides = []): array
    {
        return array_merge([
            'customer_name' => 'Juan Dela Cruz',
            'customer_email' => 'juan@example.test',
            'customer_phone' => '0917 123 4567',
            'notes' => 'Pickup at the shop.',
        ], $overrides);
    }

    /** Posts to checkout.store, completes the OTP step, returns the order. */
    private function checkout(array $details = null): Order
    {
        $this->post(route('checkout.store'), $details ?? $this->details());
        $this->completeCheckoutOtp();

        return Order::firstOrFail();
    }

    public function test_guests_are_sent_to_login_at_checkout(): void
    {
        $this->get(route('checkout.create'))->assertRedirect(route('login'));
    }

    public function test_checkout_store_only_stashes_and_requires_an_otp_first(): void
    {
        $variant = $this->variantWithStock(10);
        $user = User::factory()->create();

        $this->actingAs($user);
        $this->fill($variant, 3);

        $this->post(route('checkout.store'), $this->details())
            ->assertRedirect(route('checkout.otp.create'));

        // Nothing exists yet — the OTP step is what actually creates it.
        $this->assertSame(0, Order::count());
    }

    public function test_completing_the_otp_creates_an_order_but_does_not_touch_stock(): void
    {
        $variant = $this->variantWithStock(10);
        $user = User::factory()->create();

        $this->actingAs($user);
        $this->fill($variant, 3);

        $order = $this->checkout();

        $this->assertSame(Order::STATUS_AWAITING_PAYMENT, $order->status);
        $this->assertNull($order->paid_at);
        $this->assertSame(150000, $order->total_centavos);

        // The whole point: placing an order reserves nothing.
        $this->assertSame(10, $variant->fresh()->stock);
    }

    public function test_a_wrong_otp_does_not_create_an_order(): void
    {
        $variant = $this->variantWithStock(10);
        $user = User::factory()->create();

        $this->actingAs($user);
        $this->fill($variant, 1);
        $this->post(route('checkout.store'), $this->details());

        $this->post(route('checkout.otp.store'), ['code' => '000000'])
            ->assertSessionHasErrors('code');

        $this->assertSame(0, Order::count());
    }

    public function test_order_lines_snapshot_name_and_price(): void
    {
        $variant = $this->variantWithStock(10, 89900);
        $user = User::factory()->create();

        $this->actingAs($user);
        $this->fill($variant, 1);
        $order = $this->checkout();

        $item = $order->items()->firstOrFail();
        $originalName = $item->name_snapshot;

        // Rename and reprice the live product; the order must not follow.
        $variant->product->update(['name' => 'Totally Different', 'base_price_centavos' => 1]);

        $item->refresh();
        $this->assertSame($originalName, $item->name_snapshot);
        $this->assertSame(89900, $item->unit_price_centavos);
    }

    public function test_confirming_payment_decrements_stock_once(): void
    {
        $variant = $this->variantWithStock(10);
        $user = User::factory()->create();

        $this->actingAs($user);
        $this->fill($variant, 4);
        $order = $this->checkout();

        $this->markPaid($order);

        $order->refresh();
        $this->assertSame(Order::STATUS_PAID, $order->status);
        $this->assertNotNull($order->paid_at);
        $this->assertSame(6, $variant->fresh()->stock);

        // Idempotency: a reload of PayMongo's return page, or a double
        // click on Pay. The second confirm must be a no-op, not a second
        // decrement.
        $this->markPaid($order);

        $this->assertSame(6, $variant->fresh()->stock);
    }

    /**
     * The race the project deliberately accepts by not reserving stock: two
     * shoppers reach payment for the last items. The loser must fail cleanly
     * with the order and the stock both untouched.
     */
    public function test_payment_fails_cleanly_when_stock_ran_out_first(): void
    {
        $variant = $this->variantWithStock(5);
        $user = User::factory()->create();

        $this->actingAs($user);
        $this->fill($variant, 5);
        $order = $this->checkout();

        // Someone else buys the lot between placing the order and paying.
        $variant->update(['stock' => 1]);

        try {
            $this->markPaid($order);
            $this->fail('Confirming should have thrown InsufficientStockException.');
        } catch (InsufficientStockException) {
            // Expected — PayMongoController::settle() turns this into a
            // message for the customer.
        }

        $order->refresh();

        // Rolled back whole: not paid, and no partial decrement.
        $this->assertSame(Order::STATUS_AWAITING_PAYMENT, $order->status);
        $this->assertNull($order->paid_at);
        $this->assertSame(1, $variant->fresh()->stock);
    }

    public function test_checkout_is_blocked_when_the_cart_exceeds_stock(): void
    {
        $variant = $this->variantWithStock(10);
        $user = User::factory()->create();

        $this->actingAs($user);
        $this->fill($variant, 8);

        $variant->update(['stock' => 2]);

        $this->post(route('checkout.store'), $this->details())
            ->assertSessionHasErrors('cart');

        $this->assertSame(0, Order::count());
    }

    public function test_a_plain_checkout_defaults_to_pickup_and_gcash(): void
    {
        $variant = $this->variantWithStock(10);
        $this->actingAs(User::factory()->create());
        $this->fill($variant, 1);

        $order = $this->checkout();

        $this->assertSame('pickup', $order->fulfillment_method);
        $this->assertSame('gcash', $order->payment_method);
        $this->assertNull($order->deposit_centavos);
    }

    /** Cash on pickup was removed (client, 2026-10-31) — refused, not coerced. */
    public function test_cash_is_no_longer_accepted(): void
    {
        $variant = $this->variantWithStock(10);
        $this->actingAs(User::factory()->create());
        $this->fill($variant, 1);

        $this->post(route('checkout.store'), $this->details(['payment_method' => 'cash']))
            ->assertSessionHasErrors('payment_method');

        $this->assertDatabaseCount('orders', 0);
    }

    /** The 50% deposit is a choice now, and pickup orders can take it too. */
    public function test_a_pickup_order_can_choose_the_fifty_percent_deposit(): void
    {
        $variant = $this->variantWithStock(10, 80000);
        $this->actingAs(User::factory()->create());
        $this->fill($variant, 1);

        $order = $this->checkout($this->details(['payment_option' => 'deposit']));

        $this->assertSame('pickup', $order->fulfillment_method);
        $this->assertTrue($order->requiresDeposit());
        $this->assertSame(40000, $order->deposit_centavos);
        $this->assertSame(40000, $order->amountDueNowCentavos());
        $this->assertSame(Order::STATUS_DEPOSIT_PAID, $order->paidStatusForPaymentMethod());
    }

    public function test_a_delivery_order_can_be_paid_in_full(): void
    {
        $variant = $this->variantWithStock(10, 80000);
        $this->actingAs(User::factory()->create());
        $this->fill($variant, 1);

        $order = $this->checkout($this->details([
            'fulfillment_method' => 'delivery',
            'payment_option' => 'full',
        ] + self::ADDRESS));

        $this->assertFalse($order->requiresDeposit());
        $this->assertNull($order->deposit_centavos);
        $this->assertSame(80000, $order->amountDueNowCentavos());
    }

    /** The dropdowns only offer real places; a forged POST is checked too. */
    public function test_delivery_rejects_a_barangay_that_is_not_in_that_city(): void
    {
        $variant = $this->variantWithStock(10);
        $this->actingAs(User::factory()->create());
        $this->fill($variant, 1);

        $this->post(route('checkout.store'), $this->details([
            'fulfillment_method' => 'delivery',
            'barangay' => 'Tagas',
            // Tagas is in Daraga, not Legazpi.
            'city' => 'City of Legazpi',
        ] + self::ADDRESS))->assertSessionHasErrors('barangay');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_delivery_requires_an_address(): void
    {
        $variant = $this->variantWithStock(10);
        $this->actingAs(User::factory()->create());
        $this->fill($variant, 1);

        Mail::fake();
        $this->post(route('checkout.store'), $this->details(['fulfillment_method' => 'delivery']))
            ->assertSessionHasErrors(['address_line', 'barangay', 'city', 'province']);

        $this->assertSame(0, Order::count());
    }

    /** ceil(), not round() — deposit + balance must always sum back to the total exactly. */
    public function test_delivery_computes_a_50_percent_deposit_rounded_up(): void
    {
        $variant = $this->variantWithStock(10, 50001); // odd total centavos
        $this->actingAs(User::factory()->create());
        $this->fill($variant, 1);

        $order = $this->checkout($this->details([
            'fulfillment_method' => 'delivery',
            'payment_option' => 'deposit',
        ] + self::ADDRESS));

        $this->assertSame(50001, $order->total_centavos);
        $this->assertSame(25001, $order->deposit_centavos);
        $this->assertSame(25000, $order->balanceCentavos());
        $this->assertSame($order->deposit_centavos + $order->balanceCentavos(), $order->total_centavos);
    }

    public function test_a_delivery_order_can_take_a_fifty_percent_deposit(): void
    {
        $variant = $this->variantWithStock(10);
        $this->actingAs(User::factory()->create());
        $this->fill($variant, 1);

        $order = $this->checkout($this->details([
            'fulfillment_method' => 'delivery',
            'payment_method' => 'gcash',
            'payment_option' => 'deposit',
        ] + self::ADDRESS));

        $this->assertSame(Order::PAYMENT_METHOD_GCASH, $order->payment_method);
        $this->assertTrue($order->requiresDeposit());
        // ceil(), so deposit + balance always sums back to the total exactly.
        $this->assertSame((int) ceil($order->total_centavos / 2), $order->deposit_centavos);
        $this->assertSame($order->deposit_centavos, $order->amountDueNowCentavos());
    }

    public function test_the_otp_step_re_checks_stock_too(): void
    {
        // The advisory check in store() passes at that moment, but stock can
        // still run out while the customer is typing in their code.
        $variant = $this->variantWithStock(10);
        $user = User::factory()->create();

        $this->actingAs($user);
        $this->fill($variant, 8);
        $this->post(route('checkout.store'), $this->details());

        $variant->update(['stock' => 2]);

        $code = null;
        Mail::assertSent(\App\Mail\OtpCodeMail::class, function ($mail) use (&$code) {
            $code = $mail->code;

            return true;
        });

        $this->post(route('checkout.otp.store'), ['code' => $code])
            ->assertSessionHasErrors('cart');

        $this->assertSame(0, Order::count());
    }

    public function test_checkout_clears_the_cart(): void
    {
        $variant = $this->variantWithStock(10);
        $this->actingAs(User::factory()->create());
        $this->fill($variant, 1);
        $this->checkout();

        $this->get(route('cart.index'))
            ->assertInertia(fn ($page) => $page->has('lines', 0));
    }

    public function test_a_customer_cannot_read_someone_elses_order(): void
    {
        $variant = $this->variantWithStock(10);
        $buyer = User::factory()->create();

        $this->actingAs($buyer);
        $this->fill($variant, 1);
        $order = $this->checkout();

        $this->actingAs(User::factory()->create())
            ->get(route('orders.show', $order->order_number))
            ->assertForbidden();
    }

    public function test_staff_may_read_any_order(): void
    {
        $variant = $this->variantWithStock(10);

        $this->actingAs(User::factory()->create());
        $this->fill($variant, 1);
        $order = $this->checkout();

        $this->actingAs(User::factory()->staff()->create())
            ->get(route('orders.show', $order->order_number))
            ->assertOk();
    }

    /**
     * A /parts hardware colour choice (see PartBrowsingTest) has to survive
     * all the way onto the order, or the shop has no idea what was asked
     * for by the time it's actually fulfilling anything — see
     * CheckoutController::otpStore()'s snapshot into OrderItem.customization.
     */
    public function test_a_parts_colour_choice_survives_into_the_order(): void
    {
        $trucks = SkateboardComponent::factory()->trucks()->create(['stock' => 10]);
        $user = User::factory()->create();

        $this->actingAs($user);
        $this->post(route('cart.store'), [
            'type' => 'component',
            'id' => $trucks->id,
            'quantity' => 1,
            'color' => '#E7312F',
        ]);
        $order = $this->checkout();

        $item = $order->items()->firstOrFail();

        $this->assertSame(['color' => '#E7312F'], $item->customization);
    }

    public function test_a_line_without_a_colour_has_no_customization_snapshot(): void
    {
        $variant = $this->variantWithStock(10);
        $user = User::factory()->create();

        $this->actingAs($user);
        $this->fill($variant, 1);
        $order = $this->checkout();

        $item = $order->items()->firstOrFail();

        $this->assertNull($item->customization);
    }

    /** A town with one ZIP gets it from the list, whatever was typed. */
    public function test_a_single_zip_town_gets_its_zip_filled_in(): void
    {
        $variant = $this->variantWithStock(10);
        $this->actingAs(User::factory()->create());
        $this->fill($variant, 1);

        $order = $this->checkout($this->details([
            'fulfillment_method' => 'delivery',
            'postal_code' => '9999',
        ] + self::ADDRESS));

        $this->assertSame('4501', $order->postal_code);
    }

    /** A city split into postal areas: the ZIP must be one of its own. */
    public function test_a_multi_zip_city_needs_one_of_its_own_zips(): void
    {
        $variant = $this->variantWithStock(10);
        $this->actingAs(User::factory()->create());
        $this->fill($variant, 1);

        $manila = [
            'fulfillment_method' => 'delivery',
            'address_line' => '1 Taft Ave.',
            'province' => 'Metro Manila',
            'city' => 'City of Manila',
            'barangay' => 'Barangay 1',
        ];

        $this->post(route('checkout.store'), $this->details($manila + ['postal_code' => '4501']))
            ->assertSessionHasErrors('postal_code');

        $order = $this->checkout($this->details($manila + ['postal_code' => '1001']));
        $this->assertSame('1001', $order->postal_code);
    }

    /** Placing an order puts it in the shop team's bell — and only theirs. */
    public function test_placing_an_order_notifies_the_shop_team(): void
    {
        $staff = User::factory()->staff()->create();
        $variant = $this->variantWithStock(10);
        $customer = User::factory()->create();

        $this->actingAs($customer);
        $this->fill($variant, 1);
        $order = $this->checkout();

        $this->assertSame(1, $staff->notifications()->count());
        $this->assertSame('order', $staff->notifications()->first()->data['kind']);
        $this->assertStringContainsString($order->order_number, $staff->notifications()->first()->data['title']);
        $this->assertSame(0, $customer->notifications()->count());
    }

    /**
     * Payment tells the customer and the team; a sale that takes an item to
     * its low-stock threshold raises a stock alert, once — the next sale of
     * an already-low item doesn't repeat it.
     */
    public function test_a_payment_that_takes_stock_low_alerts_the_team_once(): void
    {
        $staff = User::factory()->staff()->create();
        $variant = $this->variantWithStock(7);
        $variant->update(['low_stock_threshold' => 5]);
        $customer = User::factory()->create();

        $this->actingAs($customer);
        $this->fill($variant, 2);
        $this->markPaid($this->checkout());

        $kinds = $staff->notifications()->pluck('data')->pluck('kind')->sort()->values()->all();
        $this->assertSame(['order', 'order', 'stock'], $kinds);
        $this->assertSame(1, $customer->notifications()->count());

        // Already low: another sale alerts the order, not the stock again.
        $this->fill($variant, 1);
        $this->post(route('checkout.store'), $this->details());
        $this->completeCheckoutOtp();
        $this->markPaid(Order::query()->latest('id')->firstOrFail());

        $this->assertSame(1, $staff->notifications()->get()->where('data.kind', 'stock')->count());
    }
}
