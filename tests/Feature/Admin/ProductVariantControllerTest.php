<?php

namespace Tests\Feature\Admin;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductVariantControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_add_a_variant_with_stock(): void
    {
        $product = Product::factory()->create();

        $this->actingAs(User::factory()->staff()->create())->post(
            route('admin.products.variants.store', $product),
            [
                'size' => 'M',
                'color' => 'Black',
                'sku' => 'SYN-TEE-M-BLK',
                'stock' => 20,
                'low_stock_threshold' => 5,
                'is_active' => true,
            ]
        );

        $this->assertDatabaseHas('product_variants', [
            'product_id' => $product->id,
            'sku' => 'SYN-TEE-M-BLK',
            'stock' => 20,
        ]);
    }

    public function test_duplicate_size_color_combination_is_rejected(): void
    {
        $product = Product::factory()->create();
        ProductVariant::factory()->create(['product_id' => $product->id, 'size' => 'M', 'color' => 'Black']);

        $this->actingAs(User::factory()->admin()->create())
            ->post(route('admin.products.variants.store', $product), [
                'size' => 'M',
                'color' => 'Black',
                'sku' => 'SYN-DUP-M-BLK',
                'stock' => 5,
                'low_stock_threshold' => 5,
            ])
            ->assertSessionHasErrors('size');
    }

    public function test_a_null_price_override_means_inherit_parent_price(): void
    {
        $product = Product::factory()->create(['base_price_centavos' => 50000]);

        $this->actingAs(User::factory()->staff()->create())->post(
            route('admin.products.variants.store', $product),
            [
                'sku' => 'SYN-INHERIT',
                'price' => '',
                'stock' => 1,
                'low_stock_threshold' => 1,
            ]
        );

        $variant = ProductVariant::where('sku', 'SYN-INHERIT')->firstOrFail();
        $this->assertNull($variant->price_centavos);
        $this->assertSame(50000, $variant->currentPriceCentavos());
    }

    public function test_a_variant_with_order_history_cannot_be_deleted(): void
    {
        $variant = ProductVariant::factory()->create();
        $order = Order::factory()->create();
        OrderItem::factory()->for_($variant, 1)->create(['order_id' => $order->id]);

        $response = $this->actingAs(User::factory()->admin()->create())
            ->delete(route('admin.products.variants.destroy', [$variant->product_id, $variant->id]));

        $response->assertSessionHasErrors('variant');
        $this->assertDatabaseHas('product_variants', ['id' => $variant->id]);
    }

    public function test_a_variant_with_no_order_history_can_be_deleted(): void
    {
        $variant = ProductVariant::factory()->create();

        $this->actingAs(User::factory()->admin()->create())
            ->delete(route('admin.products.variants.destroy', [$variant->product_id, $variant->id]));

        $this->assertDatabaseMissing('product_variants', ['id' => $variant->id]);
    }

    public function test_customers_cannot_add_variants(): void
    {
        $product = Product::factory()->create();

        $this->actingAs(User::factory()->create())
            ->post(route('admin.products.variants.store', $product), [
                'sku' => 'SYN-NOPE',
                'stock' => 1,
                'low_stock_threshold' => 1,
            ])
            ->assertForbidden();
    }
}
