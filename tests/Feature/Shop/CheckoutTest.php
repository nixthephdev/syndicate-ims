<?php

namespace Tests\Feature\Shop;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The path objective 3 rests on: cart -> order -> payment confirmed -> stock
 * decremented, atomically and exactly once.
 */
class CheckoutTest extends TestCase
{
    use RefreshDatabase;

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

    private function details(): array
    {
        return [
            'customer_name' => 'Juan Dela Cruz',
            'customer_email' => 'juan@example.test',
            'customer_phone' => '0917 123 4567',
            'notes' => 'Pickup at the shop.',
        ];
    }

    public function test_guests_are_sent_to_login_at_checkout(): void
    {
        $this->get(route('checkout.create'))->assertRedirect(route('login'));
    }

    public function test_checkout_creates_an_order_but_does_not_touch_stock(): void
    {
        $variant = $this->variantWithStock(10);
        $user = User::factory()->create();

        $this->actingAs($user);
        $this->fill($variant, 3);

        $this->post(route('checkout.store'), $this->details())
            ->assertRedirect();

        $order = Order::firstOrFail();

        $this->assertSame(Order::STATUS_AWAITING_PAYMENT, $order->status);
        $this->assertNull($order->paid_at);
        $this->assertSame(150000, $order->total_centavos);

        // The whole point: placing an order reserves nothing.
        $this->assertSame(10, $variant->fresh()->stock);
    }

    public function test_order_lines_snapshot_name_and_price(): void
    {
        $variant = $this->variantWithStock(10, 89900);
        $user = User::factory()->create();

        $this->actingAs($user);
        $this->fill($variant, 1);
        $this->post(route('checkout.store'), $this->details());

        $item = Order::firstOrFail()->items()->firstOrFail();
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
        $this->post(route('checkout.store'), $this->details());

        $order = Order::firstOrFail();

        $this->post(route('payment.confirm', $order->order_number))
            ->assertSessionHasNoErrors();

        $order->refresh();
        $this->assertSame(Order::STATUS_PAID, $order->status);
        $this->assertNotNull($order->paid_at);
        $this->assertSame(6, $variant->fresh()->stock);

        // Idempotency: PayMongo can deliver the same webhook twice. The second
        // call must be a no-op, not a second decrement.
        $this->post(route('payment.confirm', $order->order_number));

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
        $this->post(route('checkout.store'), $this->details());

        $order = Order::firstOrFail();

        // Someone else buys the lot between placing the order and paying.
        $variant->update(['stock' => 1]);

        $this->post(route('payment.confirm', $order->order_number))
            ->assertSessionHasErrors('payment');

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

    public function test_checkout_clears_the_cart(): void
    {
        $variant = $this->variantWithStock(10);
        $this->actingAs(User::factory()->create());
        $this->fill($variant, 1);
        $this->post(route('checkout.store'), $this->details());

        $this->get(route('cart.index'))
            ->assertInertia(fn ($page) => $page->has('lines', 0));
    }

    public function test_a_customer_cannot_read_someone_elses_order(): void
    {
        $variant = $this->variantWithStock(10);
        $buyer = User::factory()->create();

        $this->actingAs($buyer);
        $this->fill($variant, 1);
        $this->post(route('checkout.store'), $this->details());

        $order = Order::firstOrFail();

        $this->actingAs(User::factory()->create())
            ->get(route('orders.show', $order->order_number))
            ->assertForbidden();
    }

    public function test_staff_may_read_any_order(): void
    {
        $variant = $this->variantWithStock(10);

        $this->actingAs(User::factory()->create());
        $this->fill($variant, 1);
        $this->post(route('checkout.store'), $this->details());

        $order = Order::firstOrFail();

        $this->actingAs(User::factory()->staff()->create())
            ->get(route('orders.show', $order->order_number))
            ->assertOk();
    }

    public function test_a_customer_cannot_confirm_payment_on_another_persons_order(): void
    {
        $variant = $this->variantWithStock(10);

        $this->actingAs(User::factory()->create());
        $this->fill($variant, 2);
        $this->post(route('checkout.store'), $this->details());

        $order = Order::firstOrFail();

        $this->actingAs(User::factory()->create())
            ->post(route('payment.confirm', $order->order_number))
            ->assertForbidden();

        $this->assertSame(10, $variant->fresh()->stock);
    }

    /**
     * The simulated payment route marks orders paid for free. It must not be
     * reachable on the deployed site — PayMongo's webhook replaces it there.
     */
    public function test_simulated_payment_is_unreachable_in_production(): void
    {
        $variant = $this->variantWithStock(10);

        $this->actingAs(User::factory()->create());
        $this->fill($variant, 1);
        $this->post(route('checkout.store'), $this->details());

        $order = Order::firstOrFail();

        $this->app['env'] = 'production';

        // Leaving the "testing" environment also re-enables CSRF verification,
        // which would reject this with a 419 before the controller is reached
        // — proving nothing about the guard under test. Drop that one
        // middleware so the request actually arrives at PaymentController.
        $this->withoutMiddleware(\App\Http\Middleware\VerifyCsrfToken::class);

        $this->post(route('payment.confirm', $order->order_number))
            ->assertNotFound();

        $this->assertSame(10, $variant->fresh()->stock);
    }
}
