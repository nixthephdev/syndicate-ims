<?php

namespace Tests\Feature\Admin;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Verifies the actual Inertia component + props returned, not just HTTP
 * status — this is what stands in for a browser check for these pages.
 */
class AdminPagesRenderTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_dashboard_renders_with_stats(): void
    {
        $this->actingAs(User::factory()->admin()->create())
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Dashboard')
                ->has('stats.products')
                ->has('stats.low_stock_count')
                ->has('lowStockItems')
            );
    }

    public function test_products_index_renders_with_computed_fields(): void
    {
        $product = Product::factory()->create(['name' => 'Test Tee']);
        // Explicit distinct sizes: the factory draws size/color randomly from
        // a small set, so two unpinned variants on one product can collide
        // against the (product_id, size, color) unique constraint.
        ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'S', 'stock' => 10]);
        ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'M', 'stock' => 10]);

        $this->actingAs(User::factory()->staff()->create())
            ->get(route('admin.products.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Products/Index')
                ->has('products', 1)
                ->where('products.0.name', 'Test Tee')
                ->where('products.0.variants_count', 2)
                ->where('products.0.total_stock', 20)
            );
    }

    public function test_products_create_renders_with_categories(): void
    {
        $this->actingAs(User::factory()->admin()->create())
            ->get(route('admin.products.create'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Products/Create')
                ->where('categories', Product::CATEGORIES)
                ->where('types', Product::TYPES)
            );
    }

    public function test_products_edit_renders_product_and_its_variants(): void
    {
        $product = Product::factory()->create(['base_price_centavos' => 89900]);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'stock' => 2,
            'low_stock_threshold' => 5,
        ]);

        $this->actingAs(User::factory()->admin()->create())
            ->get(route('admin.products.edit', $product))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Products/Edit')
                // 89900 centavos / 100. Whole-peso floats lose their trailing
                // .0 in JSON (PHP's json_encode drops it by default), so the
                // value that actually reaches the browser is the int 899 —
                // asserting float 899.0 here would fail against real payload.
                ->where('product.base_price', 899)
                ->has('variants', 1)
                ->where('variants.0.sku', $variant->sku)
                // stock 2 <= threshold 5 -> the low-stock flag the badge reads.
                ->where('variants.0.is_low_stock', true)
            );
    }

    public function test_customer_gets_403_not_a_broken_page(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('admin.dashboard'))
            ->assertForbidden();
    }
}
