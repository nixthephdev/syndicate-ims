<?php

namespace Tests\Feature\Shop;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\Concerns\CompletesCheckoutOtp;
use Tests\TestCase;

/**
 * Customer self-service cancel — order-level, deliberately as narrow as
 * Admin\OrderStatusController's own awaiting_payment -> cancelled move. See
 * Shop\OrderController::cancel()'s docblock for why a PAID order cannot be
 * cancelled here.
 */
class OrderCancellationTest extends TestCase
{
    use CompletesCheckoutOtp;
    use RefreshDatabase;

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

    public function test_a_customer_can_cancel_their_own_unpaid_order(): void
    {
        $user = User::factory()->create();
        $order = $this->orderAwaitingPayment($user);

        $this->actingAs($user)
            ->post(route('orders.cancel', $order->order_number))
            ->assertSessionHasNoErrors();

        $this->assertSame(Order::STATUS_CANCELLED, $order->fresh()->status);
    }

    public function test_cancelling_does_not_touch_stock(): void
    {
        $user = User::factory()->create();
        $order = $this->orderAwaitingPayment($user, 10);

        $variant = $order->items()->firstOrFail()->purchasable;

        $this->actingAs($user)->post(route('orders.cancel', $order->order_number));

        $this->assertSame(10, $variant->fresh()->stock);
    }

    public function test_a_customer_cannot_cancel_someone_elses_order(): void
    {
        $owner = User::factory()->create();
        $order = $this->orderAwaitingPayment($owner);

        $this->actingAs(User::factory()->create())
            ->post(route('orders.cancel', $order->order_number))
            ->assertForbidden();

        $this->assertSame(Order::STATUS_AWAITING_PAYMENT, $order->fresh()->status);
    }

    public function test_a_paid_order_cannot_be_cancelled_this_way(): void
    {
        $user = User::factory()->create();
        $order = $this->orderAwaitingPayment($user);

        $this->actingAs($user);
        $this->post(route('payment.confirm', $order->order_number));
        $this->assertSame(Order::STATUS_PAID, $order->fresh()->status);

        $this->post(route('orders.cancel', $order->order_number))
            ->assertSessionHasErrors('order');

        $this->assertSame(Order::STATUS_PAID, $order->fresh()->status);
    }

    public function test_an_already_cancelled_order_cannot_be_cancelled_again(): void
    {
        $user = User::factory()->create();
        $order = $this->orderAwaitingPayment($user);

        $this->actingAs($user);
        $this->post(route('orders.cancel', $order->order_number));
        $this->assertSame(Order::STATUS_CANCELLED, $order->fresh()->status);

        $this->post(route('orders.cancel', $order->order_number))
            ->assertSessionHasErrors('order');
    }

    public function test_staff_cannot_use_the_customer_cancel_endpoint(): void
    {
        $user = User::factory()->create();
        $order = $this->orderAwaitingPayment($user);

        $this->actingAs(User::factory()->staff()->create())
            ->post(route('orders.cancel', $order->order_number))
            ->assertForbidden();

        $this->assertSame(Order::STATUS_AWAITING_PAYMENT, $order->fresh()->status);
    }

    public function test_guests_are_redirected_to_login(): void
    {
        $user = User::factory()->create();
        $order = $this->orderAwaitingPayment($user);

        // orderAwaitingPayment() leaves this test client authenticated as
        // $user (it drives the cart/checkout flow via actingAs) — log out to
        // actually exercise the guest path.
        auth()->logout();

        $this->post(route('orders.cancel', $order->order_number))
            ->assertRedirect(route('login'));
    }

    public function test_the_order_show_page_exposes_can_cancel(): void
    {
        $user = User::factory()->create();
        $order = $this->orderAwaitingPayment($user);

        $this->actingAs($user)
            ->get(route('orders.show', $order->order_number))
            ->assertInertia(fn ($page) => $page->where('order.can_cancel', true));

        $this->post(route('orders.cancel', $order->order_number));

        $this->actingAs($user)
            ->get(route('orders.show', $order->order_number))
            ->assertInertia(fn ($page) => $page->where('order.can_cancel', false));
    }
}
