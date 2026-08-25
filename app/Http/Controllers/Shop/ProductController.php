<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
    public const SORTS = ['newest', 'price_asc', 'price_desc', 'popularity'];

    /**
     * The catalogue, segregated into sections by apparel type (Tees, Hoodies,
     * Caps) rather than one flat grid. Passing `?type=tee` narrows to a
     * single section — the page renders that the same way, one section long,
     * so there is one code path for "browse everything" and "browse one
     * type" rather than two. `?q=` searches the name; `?sort=` reorders
     * within each section.
     */
    public function index(Request $request): Response
    {
        $type = $request->query('type');
        $validType = in_array($type, Product::TYPES, true) ? $type : null;
        $search = trim((string) $request->query('q'));
        $sort = in_array($request->query('sort'), self::SORTS, true) ? $request->query('sort') : 'newest';

        $products = Product::query()
            ->active()
            ->when($validType, fn ($query) => $query->type($validType))
            ->when($search !== '', fn ($query) => $query->where('name', 'like', "%{$search}%"))
            // Only active variants count toward price and stock — an archived
            // size must not make a sold-out product look available.
            ->with(['variants' => fn ($query) => $query->where('is_active', true)])
            ->orderBy($sort === 'newest' ? 'created_at' : 'name', $sort === 'newest' ? 'desc' : 'asc')
            ->get();

        // "Popularity" is real, not decorative: units sold across PAID orders
        // only, so an item nobody has actually bought can't outrank one that
        // has just because more people looked at it. One query for the whole
        // page rather than N+1 per card.
        $unitsSold = $sort === 'popularity' ? $this->unitsSoldByProduct() : collect();

        $cards = $products->map(fn (Product $product) => $this->card($product, $unitsSold->get($product->id, 0)));

        if ($sort === 'price_asc' || $sort === 'price_desc') {
            $cards = $cards->sortBy('price_from_centavos', SORT_REGULAR, $sort === 'price_desc')->values();
        } elseif ($sort === 'popularity') {
            $cards = $cards->sortByDesc('units_sold')->values();
        }

        // One section per type that actually has matching products, in a
        // fixed order — grouping alone would order sections by whichever
        // type happened to appear first in the query results. Sort order
        // computed above carries into each section since we group the
        // already-sorted collection.
        $sections = collect(Product::TYPES)
            ->map(fn ($t) => [
                'type' => $t,
                'label' => Product::TYPE_LABELS[$t],
                'products' => $cards->where('type', $t)->values(),
            ])
            ->filter(fn ($section) => $section['products']->isNotEmpty())
            ->values();

        return Inertia::render('Storefront/Shop/Index', [
            'sections' => $sections,
            'filters' => [
                'type' => $validType,
                'q' => $search !== '' ? $search : null,
                'sort' => $sort,
            ],
            'types' => Product::TYPES,
            'typeLabels' => Product::TYPE_LABELS,
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
                'type' => $product->type,
                'type_label' => $product->type ? Product::TYPE_LABELS[$product->type] : null,
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
    private function card(Product $product, int $unitsSold = 0): array
    {
        $prices = $product->variants
            ->map(fn ($variant) => $variant->currentPriceCentavos())
            ->filter()
            ->values();

        $totalStock = (int) $product->variants->sum('stock');
        $variantCount = $product->variants->count();

        // The variant Quick Add targets: prefer whichever option actually has
        // stock, not just the first row, so a hover-add can't try to buy a
        // sold-out size while a sibling size sits available. Null (and the
        // button disabled) if nothing in this product has any stock at all.
        $quickAddVariant = $product->variants
            ->where('stock', '>', 0)
            ->sortByDesc('stock')
            ->first();

        return [
            'id' => $product->id,
            'name' => $product->name,
            'slug' => $product->slug,
            'category' => $product->category,
            'type' => $product->type,
            'type_label' => $product->type ? Product::TYPE_LABELS[$product->type] : null,
            'image_path' => $product->image_path,
            // A product with per-variant price overrides has a range, not one
            // price. Both ends are sent so the page can decide how to say it.
            'price_from_centavos' => $prices->min() ?? $product->base_price_centavos,
            'price_to_centavos' => $prices->max() ?? $product->base_price_centavos,
            'total_stock' => $totalStock,
            'variant_count' => $variantCount,
            'units_sold' => $unitsSold,
            // Derived, not editorial — no "is_featured" flag exists to fake.
            // NEW: listed in the last 14 days. LIMITED: on average under 6
            // units left per option, the same kind of threshold StockBadge
            // already uses for a single variant, applied at the product level.
            'is_new' => $product->created_at?->gt(now()->subDays(14)) ?? false,
            'is_limited' => $totalStock > 0 && $variantCount > 0 && ($totalStock / $variantCount) < 6,
            'is_sold_out' => $totalStock <= 0,
            'quick_add' => $quickAddVariant ? [
                'variant_id' => $quickAddVariant->id,
                'label' => trim(($quickAddVariant->size ?? '').' '.($quickAddVariant->color ?? '')),
            ] : null,
        ];
    }

    /**
     * Units sold per product, PAID orders only — one query for the whole
     * catalogue rather than one per card. Joins order_items -> product_variants
     * to roll variant-level sales up to the product they belong to.
     *
     * @return \Illuminate\Support\Collection<int, int> product_id => units
     */
    private function unitsSoldByProduct(): \Illuminate\Support\Collection
    {
        return DB::table('order_items')
            ->join('product_variants', function ($join) {
                $join->on('product_variants.id', '=', 'order_items.purchasable_id')
                    ->where('order_items.purchasable_type', ProductVariant::class);
            })
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereNotNull('orders.paid_at')
            ->selectRaw('product_variants.product_id as product_id, SUM(order_items.quantity) as units')
            ->groupBy('product_variants.product_id')
            ->pluck('units', 'product_id');
    }
}
