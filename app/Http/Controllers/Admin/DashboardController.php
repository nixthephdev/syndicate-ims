<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\SkateboardComponent;
use App\Support\Money;
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
                'revenue_today' => Money::format(
                    (int) Order::query()->paid()->where('paid_at', '>=', now()->startOfDay())->sum('total_centavos')
                ),
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
                    'total_formatted' => Money::format($order->total_centavos),
                    'placed_at' => $order->created_at->format('d M, g:ia'),
                ]),
            'lowStockItems' => $lowVariants
                ->map(fn (ProductVariant $v) => [
                    'name' => $v->displayName(),
                    'stock' => $v->stock,
                    'threshold' => $v->low_stock_threshold,
                    'edit_url' => route('admin.products.edit', $v->product_id),
                ])
                ->concat($lowComponents->map(fn (SkateboardComponent $c) => [
                    'name' => $c->name,
                    'stock' => $c->stock,
                    'threshold' => $c->low_stock_threshold,
                    'edit_url' => null,
                ]))
                ->values(),
        ]);
    }
}
