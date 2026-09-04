<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\SkateboardComponent;
use App\Support\Money;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $lowVariants = ProductVariant::query()->lowStock()->inStock()->with('product')->get();
        $lowComponents = SkateboardComponent::query()->lowStock()->inStock()->get();
        $outOfStockVariants = ProductVariant::query()->where('stock', 0)->count();
        $outOfStockComponents = SkateboardComponent::query()->where('stock', 0)->count();

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'products' => Product::query()->count(),
                'variants' => ProductVariant::query()->count(),
                'components' => SkateboardComponent::query()->count(),
                'low_stock_count' => $lowVariants->count() + $lowComponents->count(),
                'out_of_stock_count' => $outOfStockVariants + $outOfStockComponents,
                // Orders needing someone to act: unpaid ones to chase, paid
                // ones to hand over.
                'awaiting_payment' => Order::query()->status(Order::STATUS_AWAITING_PAYMENT)->count(),
                'to_fulfil' => Order::query()->status(Order::STATUS_PAID)->count(),
                // Revenue counts PAID orders only — scopePaid() keys off
                // paid_at, so an order that was placed but never paid never
                // reaches the sales figures.
                'revenue_today_centavos' => (int) Order::query()->paid()->where('paid_at', '>=', now()->startOfDay())->sum('total_centavos'),
                // Same shape as revenue_today, one day back — powers a real
                // vs-yesterday trend badge on the Dashboard. Nothing else
                // needs a period-over-period comparison the way a running
                // "today" figure does, so this stays the one extra query
                // rather than a general trend framework nothing else uses.
                'revenue_yesterday_centavos' => (int) Order::query()->paid()
                    ->whereBetween('paid_at', [now()->subDay()->startOfDay(), now()->startOfDay()])
                    ->sum('total_centavos'),
                'revenue_total' => Money::format(
                    (int) Order::query()->paid()->sum('total_centavos')
                ),
            ],
            'recentOrders' => Order::query()
                ->with('items:id,order_id')
                ->latest()
                ->take(5)
                ->get()
                ->map(fn (Order $order) => [
                    'order_number' => $order->order_number,
                    'status' => $order->status,
                    'customer_name' => $order->customer_name,
                    'items_count' => $order->items->count(),
                    'total_formatted' => Money::format($order->total_centavos),
                    'placed_at' => $order->created_at->format('d M, g:ia'),
                ]),
            'lowStockItems' => $lowVariants
                ->map(fn (ProductVariant $v) => [
                    'name' => $v->displayName(),
                    'stock' => $v->stock,
                    'threshold' => $v->low_stock_threshold,
                    'is_low_stock' => $v->isLowStock(),
                    'is_out_of_stock' => $v->isOutOfStock(),
                    'edit_url' => route('admin.products.edit', $v->product_id),
                ])
                ->concat($lowComponents->map(fn (SkateboardComponent $c) => [
                    'name' => $c->name,
                    'stock' => $c->stock,
                    'threshold' => $c->low_stock_threshold,
                    'is_low_stock' => $c->isLowStock(),
                    'is_out_of_stock' => $c->isOutOfStock(),
                    'edit_url' => route('admin.skateboard-components.edit', $c->id),
                ]))
                ->values(),
            'revenueTrend' => $this->revenueTrend(),
            'categorySplit' => $this->categorySplit(),
            'topProducts' => $this->topProducts(),
        ]);
    }

    /**
     * Last 30 days, PAID orders only, one row per day with missing days
     * backfilled to 0 — a chart that silently skips a zero-revenue day would
     * draw a straight line across the gap instead of showing the dip.
     * Raw centavos, not a formatted string: a chart needs real numbers to
     * plot, unlike the rest of this controller's pre-formatted display data.
     */
    private function revenueTrend(): array
    {
        $rows = DB::table('orders')
            ->whereNotNull('paid_at')
            ->where('paid_at', '>=', now()->subDays(29)->startOfDay())
            ->selectRaw('DATE(paid_at) as day, SUM(total_centavos) as revenue_centavos')
            ->groupBy('day')
            ->pluck('revenue_centavos', 'day');

        $days = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = now()->subDays($i)->format('Y-m-d');
            $days[] = [
                'day' => now()->subDays($i)->format('M j'),
                'revenue_centavos' => (int) ($rows[$date] ?? 0),
            ];
        }

        return $days;
    }

    /**
     * order_items.purchasable_type already distinguishes apparel
     * (ProductVariant) from skateboard (SkateboardComponent) sales directly —
     * no need to touch Product.category at all.
     */
    private function categorySplit(): array
    {
        $rows = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereNotNull('orders.paid_at')
            ->selectRaw('order_items.purchasable_type as type, SUM(order_items.line_total_centavos) as revenue_centavos')
            ->groupBy('order_items.purchasable_type')
            ->pluck('revenue_centavos', 'type');

        return [
            'apparel_centavos' => (int) ($rows[ProductVariant::class] ?? 0),
            'skateboard_centavos' => (int) ($rows[SkateboardComponent::class] ?? 0),
        ];
    }

    /** Top 5 products by units sold, all-time, PAID orders only. */
    private function topProducts(): array
    {
        return DB::table('order_items')
            ->join('product_variants', function ($join) {
                $join->on('product_variants.id', '=', 'order_items.purchasable_id')
                    ->where('order_items.purchasable_type', ProductVariant::class);
            })
            ->join('products', 'products.id', '=', 'product_variants.product_id')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereNotNull('orders.paid_at')
            ->selectRaw('products.name as name, SUM(order_items.quantity) as units')
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('units')
            ->limit(5)
            ->get()
            ->map(fn ($row) => ['name' => $row->name, 'units' => (int) $row->units])
            ->all();
    }
}
