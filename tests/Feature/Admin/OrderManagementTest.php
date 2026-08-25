<?php

namespace Tests\Feature\Admin;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderManagementTest extends TestCase
{
    use RefreshDatabase;

    private function order(string $status = Order::STATUS_AWAITING_PAYMENT, array $attributes = []): Order
    {
        $product = Product::factory()->create();
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id, 'size' => 'M', 'stock' => 10,
        ]);

        $order = Order::create(array_merge([
            'order_number' => Order::generateOrderNumber(),
            'user_id' => User::factory()->create()->id,
            'status' => $status,
            'subtotal_centavos' => 50000,
            'total_centavos' => 50000,
            'customer_name' => 'Juan Dela Cruz',
            'customer_email' => 'juan@example.test',
            'customer_phone' => '09171234567',
        ], $attributes));

        OrderItem::create([
            'order_id' => $order->id,
            'purchasable_type' => ProductVariant::class,
            'purchasable_id' => $variant->id,
            'name_snapshot' => 'Test Tee (M)',
            'unit_price_centavos' => 50000,
            'quantity' => 1,
            'line_total_centavos' => 50000,
        ]);

        return $order;
    }

    public function test_customers_cannot_reach_admin_orders(): void
    {
        $this->order();

        $this->actingAs(User::factory()->create()) // role: customer
            ->get(route('admin.orders.index'))
            ->assertForbidden();
    }

    public function test_staff_see_the_order_list(): void
    {
        $this->order();

        $this->actingAs(User::factory()->staff()->create())
            ->get(route('admin.orders.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Orders/Index')
                ->has('orders.data', 1)
                ->where('counts.awaiting_payment', 1)
            );
    }

    public function test_the_list_can_be_filtered_by_status(): void
    {
        $this->order(Order::STATUS_AWAITING_PAYMENT);
        $this->order(Order::STATUS_PAID, ['paid_at' => now()]);

        $this->actingAs(User::factory()->staff()->create())
            ->get(route('admin.orders.index', ['status' => Order::STATUS_PAID]))
            ->assertInertia(fn ($page) => $page
                ->has('orders.data', 1)
                ->where('orders.data.0.status', Order::STATUS_PAID)
            );
    }

    public function test_the_list_can_be_searched_by_customer_email(): void
    {
        $this->order(Order::STATUS_PAID, ['customer_email' => 'findme@example.test', 'paid_at' => now()]);
        $this->order();

        $this->actingAs(User::factory()->staff()->create())
            ->get(route('admin.orders.index', ['q' => 'findme']))
            ->assertInertia(fn ($page) => $page->has('orders.data', 1));
    }

    public function test_order_detail_renders_snapshots(): void
    {
        $order = $this->order();

        $this->actingAs(User::factory()->staff()->create())
            ->get(route('admin.orders.show', $order->order_number))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Orders/Show')
                ->where('order.items.0.name', 'Test Tee (M)')
                ->where('can.cancel', true)
                ->where('can.fulfil', false)
            );
    }

    public function test_a_paid_order_can_be_marked_fulfilled(): void
    {
        $order = $this->order(Order::STATUS_PAID, ['paid_at' => now()]);

        $this->actingAs(User::factory()->staff()->create())
            ->patch(route('admin.orders.status.update', $order->order_number), [
                'status' => Order::STATUS_FULFILLED,
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame(Order::STATUS_FULFILLED, $order->fresh()->status);
    }

    public function test_an_unpaid_order_can_be_cancelled(): void
    {
        $order = $this->order(Order::STATUS_AWAITING_PAYMENT);

        $this->actingAs(User::factory()->staff()->create())
            ->patch(route('admin.orders.status.update', $order->order_number), [
                'status' => Order::STATUS_CANCELLED,
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame(Order::STATUS_CANCELLED, $order->fresh()->status);
    }

    /**
     * The transition that must NOT be possible. Cancelling a paid order needs
     * the stock putting back and the money refunding; neither exists, and
     * silently flipping the status would leave stock permanently missing.
     */
    public function test_a_paid_order_cannot_be_cancelled(): void
    {
        $order = $this->order(Order::STATUS_PAID, ['paid_at' => now()]);

        $this->actingAs(User::factory()->staff()->create())
            ->patch(route('admin.orders.status.update', $order->order_number), [
                'status' => Order::STATUS_CANCELLED,
            ])
            ->assertSessionHasErrors('status');

        $this->assertSame(Order::STATUS_PAID, $order->fresh()->status);
    }

    public function test_an_unpaid_order_cannot_skip_straight_to_fulfilled(): void
    {
        $order = $this->order(Order::STATUS_AWAITING_PAYMENT);

        $this->actingAs(User::factory()->staff()->create())
            ->patch(route('admin.orders.status.update', $order->order_number), [
                'status' => Order::STATUS_FULFILLED,
            ])
            ->assertSessionHasErrors('status');

        $this->assertSame(Order::STATUS_AWAITING_PAYMENT, $order->fresh()->status);
    }

    public function test_staff_cannot_set_an_arbitrary_status(): void
    {
        $order = $this->order(Order::STATUS_PAID, ['paid_at' => now()]);

        $this->actingAs(User::factory()->staff()->create())
            ->patch(route('admin.orders.status.update', $order->order_number), [
                'status' => Order::STATUS_PENDING,
            ])
            ->assertSessionHasErrors('status');
    }

    public function test_dashboard_reports_revenue_from_paid_orders_only(): void
    {
        $this->order(Order::STATUS_PAID, ['paid_at' => now(), 'total_centavos' => 120000]);
        // Placed but never paid — must not reach the revenue figure.
        $this->order(Order::STATUS_AWAITING_PAYMENT, ['total_centavos' => 999999]);

        $this->actingAs(User::factory()->admin()->create())
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('stats.revenue_total', '₱1,200.00')
                ->where('stats.awaiting_payment', 1)
                ->where('stats.to_fulfil', 1)
                ->has('recentOrders', 2)
            );
    }
}
