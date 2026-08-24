<?php

namespace Tests\Feature\Admin;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_customers_cannot_reach_the_admin_product_list(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('admin.products.index'))
            ->assertForbidden();
    }

    public function test_staff_can_create_a_product(): void
    {
        $response = $this->actingAs(User::factory()->staff()->create())
            ->post(route('admin.products.store'), [
                'name' => 'Syndicate Tee',
                'category' => Product::CATEGORY_APPAREL,
                'base_price' => '899.00',
                'is_active' => true,
            ]);

        $response->assertRedirect(route('admin.products.index'));

        $product = Product::where('name', 'Syndicate Tee')->firstOrFail();
        $this->assertSame('syndicate-tee', $product->slug);
        // 899.00 pesos -> centavos, exactly. This is the money-conversion path.
        $this->assertSame(89900, $product->base_price_centavos);
    }

    public function test_duplicate_product_names_get_a_unique_slug(): void
    {
        Product::factory()->create(['name' => 'Syndicate Tee', 'slug' => 'syndicate-tee']);

        $this->actingAs(User::factory()->admin()->create())->post(route('admin.products.store'), [
            'name' => 'Syndicate Tee',
            'category' => Product::CATEGORY_APPAREL,
            'base_price' => '899.00',
        ]);

        $this->assertDatabaseHas('products', ['name' => 'Syndicate Tee', 'slug' => 'syndicate-tee-2']);
    }

    /**
     * The slug uniqueness check must consider archived products too, since
     * the DB unique index does not distinguish soft-deleted rows.
     */
    public function test_slug_uniqueness_considers_archived_products(): void
    {
        $archived = Product::factory()->create(['name' => 'Old Hoodie', 'slug' => 'old-hoodie']);
        $archived->delete();

        $this->actingAs(User::factory()->admin()->create())->post(route('admin.products.store'), [
            'name' => 'Old Hoodie',
            'category' => Product::CATEGORY_APPAREL,
            'base_price' => '500',
        ]);

        $this->assertDatabaseHas('products', ['name' => 'Old Hoodie', 'slug' => 'old-hoodie-2']);
    }

    public function test_invalid_category_is_rejected(): void
    {
        $this->actingAs(User::factory()->admin()->create())
            ->post(route('admin.products.store'), [
                'name' => 'Bad Product',
                'category' => 'not-a-real-category',
                'base_price' => '100',
            ])
            ->assertSessionHasErrors('category');
    }

    public function test_destroy_archives_rather_than_deletes(): void
    {
        $product = Product::factory()->create();

        $this->actingAs(User::factory()->admin()->create())
            ->delete(route('admin.products.destroy', $product))
            ->assertRedirect(route('admin.products.index'));

        // Soft-deleted: gone from default queries, still in the table.
        $this->assertSoftDeleted($product);
    }

    public function test_updating_converts_pesos_to_centavos_correctly(): void
    {
        $product = Product::factory()->create(['base_price_centavos' => 10000]);

        $this->actingAs(User::factory()->staff()->create())->patch(
            route('admin.products.update', $product),
            [
                'name' => $product->name,
                'category' => $product->category,
                'base_price' => '1234.56',
                'is_active' => true,
            ]
        );

        $this->assertSame(123456, $product->fresh()->base_price_centavos);
    }
}
