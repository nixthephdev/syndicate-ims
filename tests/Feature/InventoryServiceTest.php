<?php

namespace Tests\Feature;

use App\Exceptions\InsufficientStockException;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductVariant;
use App\Models\SkateboardComponent;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Objective 3. These tests are the guard on the single most important rule in
 * the system: stock moves exactly once, only on confirmed payment, atomically.
 */
class InventoryServiceTest extends TestCase
{
    use RefreshDatabase;

    private InventoryService $inventory;

    protected function setUp(): void
    {
        parent::setUp();
        $this->inventory = app(InventoryService::class);
    }

    public function test_it_decrements_stock_and_marks_the_order_paid(): void
    {
        $variant = ProductVariant::factory()->withStock(10)->create();
        $order = Order::factory()->awaitingPayment()->create();
        OrderItem::factory()->for_($variant, 3)->create(['order_id' => $order->id]);

        $this->inventory->commitForPaidOrder($order);

        $this->assertSame(7, $variant->fresh()->stock);

        $order->refresh();
        $this->assertSame(Order::STATUS_PAID, $order->status);
        $this->assertNotNull($order->paid_at);
        $this->assertTrue($order->isPaid());
    }

    public function test_it_works_for_skateboard_components_too(): void
    {
        $deck = SkateboardComponent::factory()->deck()->withStock(4)->create();
        $order = Order::factory()->awaitingPayment()->create();
        OrderItem::factory()->for_($deck, 2)->create(['order_id' => $order->id]);

        $this->inventory->commitForPaidOrder($order);

        $this->assertSame(2, $deck->fresh()->stock);
    }

    public function test_it_refuses_to_oversell(): void
    {
        $variant = ProductVariant::factory()->withStock(2)->create();
        $order = Order::factory()->awaitingPayment()->create();
        OrderItem::factory()->for_($variant, 5)->create(['order_id' => $order->id]);

        $this->expectException(InsufficientStockException::class);

        try {
            $this->inventory->commitForPaidOrder($order);
        } finally {
            // Stock untouched and the order NOT marked paid.
            $this->assertSame(2, $variant->fresh()->stock);
            $this->assertSame(Order::STATUS_AWAITING_PAYMENT, $order->fresh()->status);
            $this->assertNull($order->fresh()->paid_at);
        }
    }

    /**
     * The whole reason the decrement lives in a transaction: a shortfall on a
     * later line must undo the earlier lines' decrements.
     */
    public function test_a_shortfall_rolls_back_earlier_decrements(): void
    {
        $plenty = ProductVariant::factory()->withStock(10)->create();
        $scarce = ProductVariant::factory()->withStock(1)->create();

        $order = Order::factory()->awaitingPayment()->create();
        OrderItem::factory()->for_($plenty, 2)->create(['order_id' => $order->id]);
        OrderItem::factory()->for_($scarce, 9)->create(['order_id' => $order->id]);

        try {
            $this->inventory->commitForPaidOrder($order);
            $this->fail('Expected InsufficientStockException.');
        } catch (InsufficientStockException $e) {
            // Untouched — not 8. This is the assertion that matters.
            $this->assertSame(10, $plenty->fresh()->stock);
            $this->assertSame(1, $scarce->fresh()->stock);
        }
    }

    /**
     * PayMongo can deliver the same webhook more than once. A repeat must not
     * decrement a second time.
     */
    public function test_it_is_idempotent_across_repeated_webhooks(): void
    {
        $variant = ProductVariant::factory()->withStock(10)->create();
        $order = Order::factory()->awaitingPayment()->create();
        OrderItem::factory()->for_($variant, 4)->create(['order_id' => $order->id]);

        $this->inventory->commitForPaidOrder($order);
        $this->inventory->commitForPaidOrder($order->fresh());
        $this->inventory->commitForPaidOrder($order->fresh());

        $this->assertSame(6, $variant->fresh()->stock);
    }

    /**
     * Two lines pointing at the same variant must be summed before checking.
     * Checking each line separately would approve both against the same stock.
     */
    public function test_it_aggregates_duplicate_lines_for_the_same_item(): void
    {
        $variant = ProductVariant::factory()->withStock(5)->create();
        $order = Order::factory()->awaitingPayment()->create();
        OrderItem::factory()->for_($variant, 3)->create(['order_id' => $order->id]);
        OrderItem::factory()->for_($variant, 4)->create(['order_id' => $order->id]);

        // 3 + 4 = 7 against 5 in stock — must fail, not pass twice.
        $this->expectException(InsufficientStockException::class);

        try {
            $this->inventory->commitForPaidOrder($order);
        } finally {
            $this->assertSame(5, $variant->fresh()->stock);
        }
    }

    public function test_the_exception_reports_what_was_short(): void
    {
        $variant = ProductVariant::factory()->withStock(1)->create();
        $order = Order::factory()->awaitingPayment()->create();
        OrderItem::factory()->for_($variant, 6)->create(['order_id' => $order->id]);

        try {
            $this->inventory->commitForPaidOrder($order);
            $this->fail('Expected InsufficientStockException.');
        } catch (InsufficientStockException $e) {
            $this->assertSame(6, $e->requested);
            $this->assertSame(1, $e->available);
            $this->assertStringContainsString($variant->displayName(), $e->getMessage());
        }
    }

    /**
     * A delivery order's 50% deposit commits stock like a full payment does
     * — reserving the item is the point of the deposit — but must land on
     * deposit_paid, since the balance is still due in cash on arrival.
     */
    public function test_a_deposit_commits_stock_but_lands_on_deposit_paid(): void
    {
        $variant = ProductVariant::factory()->withStock(5)->create();
        $order = Order::factory()->awaitingPayment()->create([
            'fulfillment_method' => Order::FULFILLMENT_DELIVERY,
            'deposit_centavos' => 25000,
        ]);
        OrderItem::factory()->for_($variant, 2)->create(['order_id' => $order->id]);

        $this->inventory->commitForPaidOrder($order, $order->paidStatusForPaymentMethod());

        $order->refresh();
        $this->assertSame(Order::STATUS_DEPOSIT_PAID, $order->status);
        $this->assertNotNull($order->paid_at);
        $this->assertSame(3, $variant->fresh()->stock);
    }
}
