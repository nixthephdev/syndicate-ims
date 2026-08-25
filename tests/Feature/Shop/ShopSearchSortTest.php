<?php

namespace Tests\Feature\Shop;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Search, sort and the derived NEW/LIMITED badges added to the shop grid.
 * These are real signals computed from real data — not decoration — so they
 * get the same test coverage as any other filter.
 */
class ShopSearchSortTest extends TestCase
{
    use RefreshDatabase;

    private function product(array $attributes = []): Product
    {
        return Product::factory()->create(array_merge([
            'is_active' => true,
            'category' => Product::CATEGORY_APPAREL,
        ], $attributes));
    }

    public function test_search_matches_on_name_only(): void
    {
        $this->product(['name' => 'Flame Graphic Tee']);
        $this->product(['name' => 'Minimal Wordmark Tee']);

        $this->get(route('shop.index', ['q' => 'flame']))
            ->assertInertia(fn ($page) => $page
                ->has('sections.0.products', 1)
                ->where('sections.0.products.0.name', 'Flame Graphic Tee')
                ->where('filters.q', 'flame')
            );
    }

    public function test_search_with_no_matches_returns_no_sections(): void
    {
        $this->product(['name' => 'Flame Graphic Tee']);

        $this->get(route('shop.index', ['q' => 'nonexistent-xyz']))
            ->assertInertia(fn ($page) => $page->has('sections', 0));
    }

    public function test_sort_price_orders_ascending(): void
    {
        $this->product(['name' => 'Expensive Tee', 'base_price_centavos' => 500000]);
        $this->product(['name' => 'Cheap Tee', 'base_price_centavos' => 10000]);

        $this->get(route('shop.index', ['sort' => 'price_asc']))
            ->assertInertia(fn ($page) => $page
                ->where('sections.0.products.0.name', 'Cheap Tee')
                ->where('sections.0.products.1.name', 'Expensive Tee')
            );
    }

    public function test_sort_price_desc_reverses_it(): void
    {
        $this->product(['name' => 'Expensive Tee', 'base_price_centavos' => 500000]);
        $this->product(['name' => 'Cheap Tee', 'base_price_centavos' => 10000]);

        $this->get(route('shop.index', ['sort' => 'price_desc']))
            ->assertInertia(fn ($page) => $page
                ->where('sections.0.products.0.name', 'Expensive Tee')
                ->where('sections.0.products.1.name', 'Cheap Tee')
            );
    }

    public function test_an_unrecognised_sort_falls_back_to_newest(): void
    {
        $this->product();

        $this->get(route('shop.index', ['sort' => 'literally-anything']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('filters.sort', 'newest'));
    }

    /**
     * Popularity is real sales, PAID orders only. A product with zero paid
     * sales must not outrank one with real sales just by ordering.
     */
    public function test_sort_popularity_ranks_by_units_sold_from_paid_orders_only(): void
    {
        $bestSeller = $this->product(['name' => 'Best Seller']);
        $bestSellerVariant = ProductVariant::factory()->create([
            'product_id' => $bestSeller->id, 'stock' => 50,
        ]);

        $neverSold = $this->product(['name' => 'Never Sold']);
        ProductVariant::factory()->create(['product_id' => $neverSold->id, 'stock' => 50]);

        $unpaidOnly = $this->product(['name' => 'Only Unpaid Orders']);
        $unpaidVariant = ProductVariant::factory()->create([
            'product_id' => $unpaidOnly->id, 'stock' => 50,
        ]);

        $paidOrder = Order::factory()->paid()->create();
        OrderItem::factory()->for_($bestSellerVariant, 7)->create(['order_id' => $paidOrder->id]);

        $unpaidOrder = Order::factory()->awaitingPayment()->create();
        OrderItem::factory()->for_($unpaidVariant, 99)->create(['order_id' => $unpaidOrder->id]);

        $this->get(route('shop.index', ['sort' => 'popularity']))
            ->assertInertia(fn ($page) => $page
                ->where('sections.0.products.0.name', 'Best Seller')
                ->where('sections.0.products.0.units_sold', 7)
                // The unpaid order's 99 units must not count.
                ->where('sections.0.products.2.units_sold', 0)
            );
    }

    public function test_a_freshly_created_product_is_flagged_new(): void
    {
        $product = $this->product();

        $this->get(route('shop.index'))
            ->assertInertia(fn ($page) => $page->where('sections.0.products.0.is_new', true));
    }

    public function test_an_old_product_is_not_flagged_new(): void
    {
        $product = $this->product();
        $product->forceFill(['created_at' => now()->subDays(30)])->save();

        $this->get(route('shop.index'))
            ->assertInertia(fn ($page) => $page->where('sections.0.products.0.is_new', false));
    }

    public function test_low_average_stock_is_flagged_limited(): void
    {
        $product = $this->product();
        // 2 variants averaging 2 units each — under the threshold.
        ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'S', 'stock' => 2]);
        ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'M', 'stock' => 2]);

        $this->get(route('shop.index'))
            ->assertInertia(fn ($page) => $page->where('sections.0.products.0.is_limited', true));
    }

    public function test_healthy_stock_is_not_flagged_limited(): void
    {
        $product = $this->product();
        ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'S', 'stock' => 20]);

        $this->get(route('shop.index'))
            ->assertInertia(fn ($page) => $page->where('sections.0.products.0.is_limited', false));
    }

    /**
     * Quick Add must target a variant that actually has stock, never blindly
     * the first row — a sold-out size sitting first must not be what a
     * hover-add tries to buy.
     */
    public function test_quick_add_targets_a_variant_with_stock_not_the_first_row(): void
    {
        $product = $this->product();
        ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'S', 'stock' => 0]);
        $inStock = ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'M', 'stock' => 5]);

        $this->get(route('shop.index'))
            ->assertInertia(fn ($page) => $page
                ->where('sections.0.products.0.quick_add.variant_id', $inStock->id)
            );
    }

    public function test_quick_add_is_null_when_nothing_is_in_stock(): void
    {
        $product = $this->product();
        ProductVariant::factory()->create(['product_id' => $product->id, 'stock' => 0]);

        $this->get(route('shop.index'))
            ->assertInertia(fn ($page) => $page
                ->where('sections.0.products.0.quick_add', null)
                ->where('sections.0.products.0.is_sold_out', true)
            );
    }
}
