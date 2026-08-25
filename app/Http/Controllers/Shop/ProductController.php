<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The customer-facing catalogue. Read-only — nothing here writes stock.
 *
 * Everything is scoped to active products and active variants: `is_active`
 * false is how staff take something off the shop floor without deleting its
 * order history.
 */
class ProductController extends Controller
{
    public function index(Request $request): Response
    {
        $category = $request->query('category');

        $products = Product::query()
            ->active()
            ->when(
                in_array($category, Product::CATEGORIES, true),
                fn ($query) => $query->category($category)
            )
            // Only active variants count toward price and stock — an archived
            // size must not make a sold-out product look available.
            ->with(['variants' => fn ($query) => $query->where('is_active', true)])
            ->orderBy('name')
            ->get()
            ->map(fn (Product $product) => $this->card($product));

        return Inertia::render('Storefront/Shop/Index', [
            'products' => $products,
            'filters' => [
                'category' => in_array($category, Product::CATEGORIES, true) ? $category : null,
            ],
            'categories' => Product::CATEGORIES,
        ]);
    }

    public function show(Product $product): Response
    {
        abort_unless($product->is_active, 404);

        $product->load(['variants' => fn ($query) => $query->where('is_active', true)
            ->orderBy('color')
            ->orderBy('id'),
        ]);

        return Inertia::render('Storefront/Shop/Show', [
            'product' => [
                'id' => $product->id,
                'name' => $product->name,
                'slug' => $product->slug,
                'description' => $product->description,
                'category' => $product->category,
                'image_path' => $product->image_path,
                'base_price_centavos' => $product->base_price_centavos,
                'variants' => $product->variants->map(fn ($variant) => [
                    'id' => $variant->id,
                    'size' => $variant->size,
                    'color' => $variant->color,
                    'sku' => $variant->sku,
                    'price_centavos' => $variant->currentPriceCentavos(),
                    // Shown so a shopper isn't offered a size that isn't
                    // there. Advisory: the cart does not reserve, and
                    // checkout re-checks behind a row lock.
                    'stock' => $variant->availableStock(),
                    'is_low' => $variant->isLowStock() && ! $variant->isOutOfStock(),
                ]),
            ],
        ]);
    }

    /** Shape one product for the grid. */
    private function card(Product $product): array
    {
        $prices = $product->variants
            ->map(fn ($variant) => $variant->currentPriceCentavos())
            ->filter()
            ->values();

        return [
            'id' => $product->id,
            'name' => $product->name,
            'slug' => $product->slug,
            'category' => $product->category,
            'image_path' => $product->image_path,
            // A product with per-variant price overrides has a range, not one
            // price. Both ends are sent so the page can decide how to say it.
            'price_from_centavos' => $prices->min() ?? $product->base_price_centavos,
            'price_to_centavos' => $prices->max() ?? $product->base_price_centavos,
            'total_stock' => (int) $product->variants->sum('stock'),
            'variant_count' => $product->variants->count(),
        ];
    }
}
