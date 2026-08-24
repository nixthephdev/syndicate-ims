<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\SkateboardComponent;
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
            ],
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
