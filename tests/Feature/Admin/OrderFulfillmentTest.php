<?php

namespace Tests\Feature\Admin;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The fulfillment axis — "where is my order?" — which is deliberately a
 * different column and controller from the payment status transitions
 * OrderManagementTest already covers.
 */
class OrderFulfillmentTest extends TestCase
{
    use RefreshDatabase;

    private function order(string $status = Order::STATUS_PAID, array $attributes = []): Order
    {
        $variant = ProductVariant::factory()->create([
            'product_id' => Product::factory()->create()->id,
            'size' => 'M',
            'stock' => 10,
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

    private function advance(Order $order, string $stage)
    {
        return $this->actingAs(User::factory()->staff()->create())
            ->patch(route('admin.orders.fulfillment.update', $order->order_number), ['stage' => $stage]);
    }

    public function test_a_new_order_starts_at_not_started(): void
    {
        $this->assertSame(Order::STAGE_NOT_STARTED, $this->order()->fulfillment_stage);
    }

    public function test_a_pickup_order_walks_preparing_ready_then_picked_up(): void
    {
        $order = $this->order(Order::STATUS_PAID, ['fulfillment_method' => Order::FULFILLMENT_PICKUP]);

        $this->advance($order, Order::STAGE_PREPARING);
        $this->assertSame(Order::STAGE_PREPARING, $order->fresh()->fulfillment_stage);

        $this->advance($order, Order::STAGE_READY);
        $this->assertSame(Order::STAGE_READY, $order->fresh()->fulfillment_stage);

        $this->advance($order, Order::STAGE_COMPLETED);
        $this->assertSame(Order::STAGE_COMPLETED, $order->fresh()->fulfillment_stage);
    }

    public function test_a_delivery_order_goes_out_for_delivery_not_ready_for_pickup(): void
    {
        $order = $this->order(Order::STATUS_DEPOSIT_PAID, [
            'fulfillment_method' => Order::FULFILLMENT_DELIVERY,
            'payment_method' => Order::PAYMENT_METHOD_GCASH_DEPOSIT,
            'deposit_centavos' => 25000,
        ]);

        $this->advance($order, Order::STAGE_PREPARING);

        // "ready" belongs to the pickup path only — it must be rejected here.
        $this->advance($order, Order::STAGE_READY)->assertSessionHasErrors('status');
        $this->assertSame(Order::STAGE_PREPARING, $order->fresh()->fulfillment_stage);

        $this->advance($order, Order::STAGE_OUT_FOR_DELIVERY);
        $this->assertSame(Order::STAGE_OUT_FOR_DELIVERY, $order->fresh()->fulfillment_stage);
    }

    /**
     * The whole reason this is a separate column. A delivery order is only
     * half paid for its entire journey, and DashboardController's revenue
     * SQL keys off status = 'deposit_paid' to count only the deposit.
     */
    public function test_advancing_a_delivery_order_does_not_disturb_its_deposit_paid_status(): void
    {
        $order = $this->order(Order::STATUS_DEPOSIT_PAID, [
            'fulfillment_method' => Order::FULFILLMENT_DELIVERY,
            'payment_method' => Order::PAYMENT_METHOD_GCASH_DEPOSIT,
            'deposit_centavos' => 25000,
        ]);

        $this->advance($order, Order::STAGE_PREPARING);
        $this->advance($order, Order::STAGE_OUT_FOR_DELIVERY);

        $this->assertSame(Order::STATUS_DEPOSIT_PAID, $order->fresh()->status);
        $this->assertSame(25000, $order->fresh()->deposit_centavos);
    }

    public function test_reaching_the_last_stage_also_marks_the_order_fulfilled(): void
    {
        $order = $this->order(Order::STATUS_PAID, ['fulfillment_method' => Order::FULFILLMENT_PICKUP]);

        $this->advance($order, Order::STAGE_PREPARING);
        $this->advance($order, Order::STAGE_READY);
        $this->advance($order, Order::STAGE_COMPLETED);

        $this->assertSame(Order::STATUS_FULFILLED, $order->fresh()->status);
    }

    public function test_stages_cannot_be_skipped(): void
    {
        $order = $this->order(Order::STATUS_PAID, ['fulfillment_method' => Order::FULFILLMENT_PICKUP]);

        $this->advance($order, Order::STAGE_COMPLETED)->assertSessionHasErrors('status');

        $this->assertSame(Order::STAGE_NOT_STARTED, $order->fresh()->fulfillment_stage);
        $this->assertSame(Order::STATUS_PAID, $order->fresh()->status);
    }

    public function test_an_unpaid_order_cannot_be_tracked_at_all(): void
    {
        $order = $this->order(Order::STATUS_AWAITING_PAYMENT);

        $this->assertNull($order->trackingPayload());
        $this->advance($order, Order::STAGE_PREPARING)->assertSessionHasErrors('status');
    }

    public function test_the_existing_mark_fulfilled_shortcut_keeps_both_axes_in_step(): void
    {
        $order = $this->order(Order::STATUS_PAID, ['fulfillment_method' => Order::FULFILLMENT_PICKUP]);

        $this->actingAs(User::factory()->staff()->create())
            ->patch(route('admin.orders.status.update', $order->order_number), [
                'status' => Order::STATUS_FULFILLED,
            ]);

        $this->assertSame(Order::STATUS_FULFILLED, $order->fresh()->status);
        $this->assertSame(Order::STAGE_COMPLETED, $order->fresh()->fulfillment_stage);
    }

    public function test_customers_cannot_advance_a_stage(): void
    {
        $order = $this->order();

        $this->actingAs(User::factory()->create()) // role: customer
            ->patch(route('admin.orders.fulfillment.update', $order->order_number), [
                'stage' => Order::STAGE_PREPARING,
            ])
            ->assertForbidden();

        $this->assertSame(Order::STAGE_NOT_STARTED, $order->fresh()->fulfillment_stage);
    }

    public function test_the_customer_sees_their_own_tracking_on_the_order_page(): void
    {
        $user = User::factory()->create();
        $order = $this->order(Order::STATUS_PAID, [
            'user_id' => $user->id,
            'fulfillment_method' => Order::FULFILLMENT_PICKUP,
            'fulfillment_stage' => Order::STAGE_READY,
        ]);

        $this->actingAs($user)
            ->get(route('orders.show', $order->order_number))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Storefront/Orders/Show')
                ->where('order.tracking.stage', Order::STAGE_READY)
                ->where('order.tracking.stage_label', 'Ready for pickup')
                ->has('order.tracking.steps', 4)
            );
    }
}
