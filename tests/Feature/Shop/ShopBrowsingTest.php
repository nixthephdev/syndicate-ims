<?php

namespace Tests\Feature\Shop;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\Cart;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShopBrowsingTest extends TestCase
{
    use RefreshDatabase;

    private function product(array $attributes = []): Product
    {
        return Product::factory()->create(array_merge([
            'is_active' => true,
            'category' => Product::CATEGORY_APPAREL,
        ], $attributes));
    }

    public function test_shop_lists_only_active_products(): void
    {
        $live = $this->product(['name' => 'Live Tee']);
        $this->product(['name' => 'Retired Tee', 'is_active' => false]);

        ProductVariant::factory()->create([
            'product_id' => $live->id, 'size' => 'M', 'stock' => 5, 'is_active' => true,
        ]);

        $this->get(route('shop.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Storefront/Shop/Index')
                ->has('products', 1)
                ->where('products.0.name', 'Live Tee')
            );
    }

    public function test_inactive_variants_do_not_count_toward_stock(): void
    {
        $product = $this->product();

        ProductVariant::factory()->create([
            'product_id' => $product->id, 'size' => 'S', 'stock' => 4, 'is_active' => true,
        ]);
        // Archived, but still carrying stock. It must not make the product
        // look more available than it is.
        ProductVariant::factory()->create([
            'product_id' => $product->id, 'size' => 'M', 'stock' => 99, 'is_active' => false,
        ]);

        $this->get(route('shop.index'))
            ->assertInertia(fn ($page) => $page->where('products.0.total_stock', 4));
    }

    public function test_an_archived_product_page_is_not_reachable(): void
    {
        $product = $this->product(['is_active' => false]);

        $this->get(route('shop.show', $product->slug))->assertNotFound();
    }

    public function test_adding_to_cart_stores_a_line_and_updates_the_badge(): void
    {
        $product = $this->product();
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id, 'size' => 'M', 'stock' => 10, 'is_active' => true,
        ]);

        $this->from(route('shop.show', $product->slug))
            ->post(route('cart.store'), [
                'type' => 'variant',
                'id' => $variant->id,
                'quantity' => 2,
            ])
            ->assertRedirect(route('shop.show', $product->slug));

        $this->get(route('cart.index'))
            ->assertInertia(fn ($page) => $page
                ->component('Storefront/Cart')
                ->has('lines', 1)
                ->where('lines.0.quantity', 2)
                ->where('cart.count', 2)
            );
    }

    public function test_adding_the_same_variant_twice_merges_into_one_line(): void
    {
        $product = $this->product();
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id, 'size' => 'M', 'stock' => 10, 'is_active' => true,
        ]);

        $payload = ['type' => 'variant', 'id' => $variant->id, 'quantity' => 1];

        $this->post(route('cart.store'), $payload);
        $this->post(route('cart.store'), $payload);

        $this->get(route('cart.index'))
            ->assertInertia(fn ($page) => $page
                ->has('lines', 1)
                ->where('lines.0.quantity', 2)
            );
    }

    public function test_a_sold_out_variant_cannot_be_added(): void
    {
        $product = $this->product();
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id, 'size' => 'M', 'stock' => 0, 'is_active' => true,
        ]);

        $this->post(route('cart.store'), [
            'type' => 'variant', 'id' => $variant->id, 'quantity' => 1,
        ])->assertSessionHasErrors('cart');

        $this->assertSame([], session(Cart::SESSION_KEY, []));
    }

    /**
     * The type comes off request input. It is an alias resolved through an
     * allow-list, never a class name — otherwise the request could name any
     * class in the application for the container to build.
     */
    public function test_cart_rejects_an_arbitrary_class_name_as_type(): void
    {
        $this->post(route('cart.store'), [
            'type' => User::class,
            'id' => 1,
            'quantity' => 1,
        ])->assertSessionHasErrors('type');
    }

    public function test_cart_quantity_is_capped(): void
    {
        $product = $this->product();
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id, 'size' => 'M', 'stock' => 500, 'is_active' => true,
        ]);

        $this->post(route('cart.store'), [
            'type' => 'variant', 'id' => $variant->id, 'quantity' => 9999,
        ])->assertSessionHasErrors('quantity');
    }

    public function test_setting_a_line_quantity_to_zero_removes_it(): void
    {
        $product = $this->product();
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id, 'size' => 'M', 'stock' => 10, 'is_active' => true,
        ]);

        $this->post(route('cart.store'), [
            'type' => 'variant', 'id' => $variant->id, 'quantity' => 3,
        ]);

        $key = Cart::key(ProductVariant::class, $variant->id);

        $this->patch(route('cart.update'), ['key' => $key, 'quantity' => 0]);

        $this->get(route('cart.index'))
            ->assertInertia(fn ($page) => $page->has('lines', 0));
    }

    /**
     * A cart can sit in a session for days. If staff archive the variant in
     * the meantime the line must disappear rather than ride to checkout.
     */
    public function test_a_line_whose_variant_was_archived_is_dropped(): void
    {
        $product = $this->product();
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id, 'size' => 'M', 'stock' => 10, 'is_active' => true,
        ]);

        $this->post(route('cart.store'), [
            'type' => 'variant', 'id' => $variant->id, 'quantity' => 1,
        ]);

        $variant->update(['is_active' => false]);

        $this->get(route('cart.index'))
            ->assertInertia(fn ($page) => $page
                ->has('lines', 0)
                ->where('cart.count', 0)
            );
    }
}
