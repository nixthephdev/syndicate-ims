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
 * The sales & trends tab (client, 2026-10-31). Same counting rules as the
 * dashboard: paid orders only, by payment date, deposits count the deposit.
 */
class SalesReportTest extends TestCase
{
    use RefreshDatabase;

    private function paidOrder(int $total, string $paidAt, array $attributes = []): Order
    {
        $order = Order::factory()->create(array_merge([
            'status' => Order::STATUS_PAID,
            'subtotal_centavos' => $total,
            'total_centavos' => $total,
            'paid_at' => $paidAt,
            'created_at' => $paidAt,
        ], $attributes));

        $variant = ProductVariant::factory()->create([
            'product_id' => Product::factory()->create(['name' => 'Box Logo Tee'])->id,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'purchasable_type' => ProductVariant::class,
            'purchasable_id' => $variant->id,
            'name_snapshot' => 'Box Logo Tee (M / Black)',
            'unit_price_centavos' => $total,
            'quantity' => 1,
            'line_total_centavos' => $total,
        ]);

        return $order;
    }

    public function test_the_report_sums_only_paid_orders_in_the_range(): void
    {
        $this->paidOrder(100000, '2026-10-10 10:00:00');
        // A deposit order counts only what was collected.
        $this->paidOrder(80000, '2026-10-12 10:00:00', ['status' => Order::STATUS_DEPOSIT_PAID, 'deposit_centavos' => 40000]);
        // Outside the range, and an unpaid one inside it — neither counts.
        $this->paidOrder(999900, '2026-09-01 10:00:00');
        Order::factory()->create(['status' => Order::STATUS_AWAITING_PAYMENT, 'created_at' => '2026-10-11 10:00:00']);

        $this->actingAs(User::factory()->staff()->create())
            ->get(route('admin.sales.index', ['from' => '2026-10-01', 'to' => '2026-10-31', 'interval' => 'day']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Sales/Index')
                ->where('summary.orders', 2)
                ->where('summary.revenue_centavos', 140000)
                ->where('summary.balance_due_centavos', 40000)
                ->has('trend', 31)
                ->where('top_items.0.name', 'Box Logo Tee')
            );
    }

    public function test_the_csv_export_opens_in_excel_and_is_logged(): void
    {
        $this->paidOrder(100000, '2026-10-10 10:00:00');

        $response = $this->actingAs(User::factory()->staff()->create())
            ->get(route('admin.sales.export', ['from' => '2026-10-01', 'to' => '2026-10-31', 'interval' => 'month']));

        $response->assertOk();
        $csv = $response->getContent();
        // UTF-8 BOM, so Excel reads ₱ and ñ properly.
        $this->assertStringStartsWith("\xEF\xBB\xBF", $csv);
        $this->assertStringContainsString('"Oct 2026",1,1000', $csv);
        $this->assertDatabaseHas('audit_logs', ['action' => 'report.exported']);
    }

    public function test_customers_cannot_see_it(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('admin.sales.index'))
            ->assertForbidden();
    }
}
