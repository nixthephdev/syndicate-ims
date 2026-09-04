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

    /**
     * cart.store requires sign-in (client requirement, 2026-09-02) — every
     * test that adds to the cart needs a logged-in user to reach it at all.
     */
    private function loginAsCustomer(): User
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        return $user;
    }

    public function test_shop_lists_only_active_products(): void
    {
        $live = $this->product(['name' => 'Live Tee']);
        $this->product(['name' => 'Retired Tee', 'is_active' => false]);

        ProductVariant::factory()->create([
            'product_id' => $live->id, 'size' => 'M', 'stock' => 5, 'is_active' => true,
        ]);

        // The catalogue is segregated into one section per type — see
        // ProductController::index(). Both factory products default to
        // TYPE_TEE, so this expects exactly one section with one product.
        $this->get(route('shop.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Storefront/Shop/Index')
                ->has('sections', 1)
                ->has('sections.0.products', 1)
                ->where('sections.0.products.0.name', 'Live Tee')
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
            ->assertInertia(fn ($page) => $page->where('sections.0.products.0.total_stock', 4));
    }

    public function test_products_are_segregated_into_sections_by_type(): void
    {
        $this->product(['name' => 'A Tee', 'type' => Product::TYPE_TEE]);
        $this->product(['name' => 'A Hoodie', 'type' => Product::TYPE_HOODIE]);
        $this->product(['name' => 'A Cap', 'type' => Product::TYPE_CAP]);

        $this->get(route('shop.index'))
            ->assertInertia(fn ($page) => $page
                ->has('sections', 3)
                // Fixed order (Product::TYPES), not insertion order.
                ->where('sections.0.type', Product::TYPE_TEE)
                ->where('sections.1.type', Product::TYPE_HOODIE)
                ->where('sections.2.type', Product::TYPE_CAP)
            );
    }

    public function test_a_type_with_no_active_products_gets_no_section(): void
    {
        $this->product(['type' => Product::TYPE_TEE]);
        // No hoodie or cap products at all.

        $this->get(route('shop.index'))
            ->assertInertia(fn ($page) => $page->has('sections', 1));
    }

    public function test_the_type_filter_narrows_to_one_section(): void
    {
        $this->product(['name' => 'A Tee', 'type' => Product::TYPE_TEE]);
        $this->product(['name' => 'A Hoodie', 'type' => Product::TYPE_HOODIE]);

        $this->get(route('shop.index', ['type' => Product::TYPE_HOODIE]))
            ->assertInertia(fn ($page) => $page
                ->has('sections', 1)
                ->where('sections.0.type', Product::TYPE_HOODIE)
                ->where('sections.0.products.0.name', 'A Hoodie')
                ->where('filters.type', Product::TYPE_HOODIE)
            );
    }

    public function test_an_unrecognised_type_filter_is_ignored_not_errored(): void
    {
        $this->product(['type' => Product::TYPE_TEE]);

        $this->get(route('shop.index', ['type' => 'not-a-real-type']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('filters.type', null)
                ->has('sections', 1)
            );
    }

    public function test_an_archived_product_page_is_not_reachable(): void
    {
        $product = $this->product(['is_active' => false]);

        $this->get(route('shop.show', $product->slug))->assertNotFound();
    }

    public function test_adding_to_cart_stores_a_line_and_updates_the_badge(): void
    {
        $this->loginAsCustomer();

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
        $this->loginAsCustomer();

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
        $this->loginAsCustomer();

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
        $this->loginAsCustomer();

        $this->post(route('cart.store'), [
            'type' => User::class,
            'id' => 1,
            'quantity' => 1,
        ])->assertSessionHasErrors('type');
    }

    public function test_cart_quantity_is_capped(): void
    {
        $this->loginAsCustomer();

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
        $this->loginAsCustomer();

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
        $this->loginAsCustomer();

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

    /**
     * Client requirement, 2026-09-02: adding to cart now requires an
     * account. A guest hitting Quick Add or the product page's Add to Cart
     * must be sent to log in, not silently succeed.
     */
    public function test_guest_is_redirected_to_login_when_adding_to_cart(): void
    {
        $product = $this->product();
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id, 'size' => 'M', 'stock' => 10, 'is_active' => true,
        ]);

        $this->post(route('cart.store'), [
            'type' => 'variant', 'id' => $variant->id, 'quantity' => 1,
        ])->assertRedirect(route('login', ['reason' => 'cart']));

        $this->assertSame([], session(Cart::SESSION_KEY, []));
    }

    /**
     * Custom-board cart lines (see CustomizeTest) share a build_key and the
     * cart page updates/removes them together via a `keys` array rather than
     * a single `key`. This pins that cart.update/cart.destroy accept it —
     * an ordinary single-`key` apparel line is unaffected either way.
     */
    public function test_cart_update_accepts_an_array_of_keys(): void
    {
        $this->loginAsCustomer();

        $productA = $this->product();
        $variantA = ProductVariant::factory()->create([
            'product_id' => $productA->id, 'size' => 'M', 'stock' => 10, 'is_active' => true,
        ]);
        $productB = $this->product();
        $variantB = ProductVariant::factory()->create([
            'product_id' => $productB->id, 'size' => 'M', 'stock' => 10, 'is_active' => true,
        ]);

        $this->post(route('cart.store'), ['type' => 'variant', 'id' => $variantA->id, 'quantity' => 1]);
        $this->post(route('cart.store'), ['type' => 'variant', 'id' => $variantB->id, 'quantity' => 1]);

        $keys = [
            Cart::key(ProductVariant::class, $variantA->id),
            Cart::key(ProductVariant::class, $variantB->id),
        ];

        $this->patch(route('cart.update'), ['keys' => $keys, 'quantity' => 3]);

        $this->get(route('cart.index'))
            ->assertInertia(fn ($page) => $page
                ->has('lines', 2)
                ->where('lines.0.quantity', 3)
                ->where('lines.1.quantity', 3)
            );
    }

    public function test_cart_destroy_accepts_an_array_of_keys(): void
    {
        $this->loginAsCustomer();

        $productA = $this->product();
        $variantA = ProductVariant::factory()->create([
            'product_id' => $productA->id, 'size' => 'M', 'stock' => 10, 'is_active' => true,
        ]);
        $productB = $this->product();
        $variantB = ProductVariant::factory()->create([
            'product_id' => $productB->id, 'size' => 'M', 'stock' => 10, 'is_active' => true,
        ]);

        $this->post(route('cart.store'), ['type' => 'variant', 'id' => $variantA->id, 'quantity' => 1]);
        $this->post(route('cart.store'), ['type' => 'variant', 'id' => $variantB->id, 'quantity' => 1]);

        $keys = [
            Cart::key(ProductVariant::class, $variantA->id),
            Cart::key(ProductVariant::class, $variantB->id),
        ];

        $this->delete(route('cart.destroy'), ['keys' => $keys]);

        $this->get(route('cart.index'))
            ->assertInertia(fn ($page) => $page->has('lines', 0));
    }
}
