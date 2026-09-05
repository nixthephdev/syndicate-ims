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

    /**
     * A delivery order's 50% deposit only has the deposit amount actually
     * collected — the dashboard's headline revenue figure must not count
     * the full order total until the balance is later collected in cash.
     */
    public function test_dashboard_revenue_counts_only_the_deposit_for_a_deposit_paid_order(): void
    {
        $this->order(Order::STATUS_DEPOSIT_PAID, [
            'paid_at' => now(),
            'total_centavos' => 100000,
            'deposit_centavos' => 50000,
            'fulfillment_method' => Order::FULFILLMENT_DELIVERY,
            'payment_method' => Order::PAYMENT_METHOD_GCASH_DEPOSIT,
        ]);

        $this->actingAs(User::factory()->admin()->create())
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('stats.revenue_total', '₱500.00')
                ->where('stats.to_fulfil', 1)
            );
    }

    /**
     * A delivery order's stock is already committed once the deposit clears —
     * marking it fulfilled (delivered, balance collected in cash) is the
     * same one-step action a fully paid order gets, not a separate flow.
     */
    public function test_a_deposit_paid_order_can_be_marked_fulfilled(): void
    {
        $order = $this->order(Order::STATUS_DEPOSIT_PAID, [
            'paid_at' => now(),
            'deposit_centavos' => 25000,
            'fulfillment_method' => Order::FULFILLMENT_DELIVERY,
            'payment_method' => Order::PAYMENT_METHOD_GCASH_DEPOSIT,
        ]);

        $this->actingAs(User::factory()->staff()->create())
            ->get(route('admin.orders.show', $order->order_number))
            ->assertInertia(fn ($page) => $page->where('can.fulfil', true));

        $this->actingAs(User::factory()->staff()->create())
            ->patch(route('admin.orders.status.update', $order->order_number), [
                'status' => Order::STATUS_FULFILLED,
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame(Order::STATUS_FULFILLED, $order->fresh()->status);
    }

    /** Same rule a plain paid order already follows: committed stock means no cancelling here. */
    public function test_a_deposit_paid_order_cannot_be_cancelled(): void
    {
        $order = $this->order(Order::STATUS_DEPOSIT_PAID, [
            'paid_at' => now(),
            'deposit_centavos' => 25000,
        ]);

        $this->actingAs(User::factory()->staff()->create())
            ->patch(route('admin.orders.status.update', $order->order_number), [
                'status' => Order::STATUS_CANCELLED,
            ])
            ->assertSessionHasErrors('status');

        $this->assertSame(Order::STATUS_DEPOSIT_PAID, $order->fresh()->status);
    }

    public function test_staff_can_confirm_a_cash_pickup_order_and_stock_is_committed(): void
    {
        $order = $this->order(Order::STATUS_AWAITING_PAYMENT, [
            'payment_method' => Order::PAYMENT_METHOD_CASH,
        ]);
        $variant = $order->items()->firstOrFail()->purchasable;

        $this->actingAs(User::factory()->staff()->create())
            ->patch(route('admin.orders.cash.confirm', $order->order_number))
            ->assertSessionHasNoErrors();

        $order->refresh();
        $this->assertSame(Order::STATUS_PAID, $order->status);
        $this->assertNotNull($order->paid_at);
        $this->assertSame(9, $variant->fresh()->stock);
    }

    public function test_confirming_cash_is_refused_for_a_gcash_order(): void
    {
        $order = $this->order(Order::STATUS_AWAITING_PAYMENT, [
            'payment_method' => Order::PAYMENT_METHOD_GCASH,
        ]);

        $this->actingAs(User::factory()->staff()->create())
            ->patch(route('admin.orders.cash.confirm', $order->order_number))
            ->assertSessionHasErrors('payment');

        $this->assertSame(Order::STATUS_AWAITING_PAYMENT, $order->fresh()->status);
    }

    public function test_confirming_cash_is_refused_once_already_paid(): void
    {
        $order = $this->order(Order::STATUS_PAID, [
            'paid_at' => now(),
            'payment_method' => Order::PAYMENT_METHOD_CASH,
        ]);

        $this->actingAs(User::factory()->staff()->create())
            ->patch(route('admin.orders.cash.confirm', $order->order_number))
            ->assertSessionHasErrors('payment');
    }
}
