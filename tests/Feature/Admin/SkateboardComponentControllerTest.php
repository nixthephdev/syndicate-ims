<?php

namespace Tests\Feature\Admin;

use App\Models\SkateboardComponent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SkateboardComponentControllerTest extends TestCase
{
    use RefreshDatabase;

    private function staff(): User
    {
        return User::factory()->create(['role' => User::ROLE_STAFF]);
    }

    public function test_customers_cannot_reach_the_component_list(): void
    {
        $customer = User::factory()->create(['role' => User::ROLE_CUSTOMER]);
        $component = SkateboardComponent::factory()->deck()->create();

        $this->actingAs($customer)
            ->get(route('admin.skateboard-components.index'))
            ->assertForbidden();

        $this->actingAs($customer)
            ->get(route('admin.skateboard-components.edit', $component))
            ->assertForbidden();
    }

    public function test_staff_see_the_component_list_grouped_by_type(): void
    {
        SkateboardComponent::factory()->deck()->create(['name' => 'A Deck']);
        SkateboardComponent::factory()->wheels()->create(['name' => 'Some Wheels']);

        $this->actingAs($this->staff())
            ->get(route('admin.skateboard-components.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/SkateboardComponents/Index')
                ->has('components', 2)
            );
    }

    public function test_staff_can_update_stock_price_and_threshold(): void
    {
        $component = SkateboardComponent::factory()->deck()->create([
            'price_centavos' => 200000,
            'stock' => 10,
            'low_stock_threshold' => 5,
        ]);

        $this->actingAs($this->staff())
            ->patch(route('admin.skateboard-components.update', $component), [
                'name' => $component->name,
                'price' => 2500.50,
                'stock' => 3,
                'low_stock_threshold' => 4,
                'is_active' => true,
            ])
            ->assertRedirect();

        $component->refresh();
        $this->assertSame(250050, $component->price_centavos);
        $this->assertSame(3, $component->stock);
        $this->assertSame(4, $component->low_stock_threshold);
    }

    public function test_negative_stock_is_rejected(): void
    {
        $component = SkateboardComponent::factory()->deck()->create();

        $this->actingAs($this->staff())
            ->patch(route('admin.skateboard-components.update', $component), [
                'name' => $component->name,
                'price' => 100,
                'stock' => -5,
                'low_stock_threshold' => 5,
                'is_active' => true,
            ])
            ->assertSessionHasErrors('stock');
    }

    /**
     * The whole point of the edit-only decision: glb_file/mesh_name/type are
     * load-bearing for the 3D customizer's mesh lookup, so an update must
     * never be able to change them even if a crafted request includes them.
     */
    public function test_glb_file_mesh_name_and_type_cannot_be_changed_via_update(): void
    {
        $component = SkateboardComponent::factory()->deck()->create([
            'glb_file' => SkateboardComponent::GLB_BOARD,
            'mesh_name' => 'original-mesh',
            'type' => SkateboardComponent::TYPE_DECK,
        ]);

        $this->actingAs($this->staff())
            ->patch(route('admin.skateboard-components.update', $component), [
                'name' => $component->name,
                'price' => 100,
                'stock' => 5,
                'low_stock_threshold' => 5,
                'is_active' => true,
                // Crafted extra fields — must be silently ignored.
                'glb_file' => SkateboardComponent::GLB_WHEELS,
                'mesh_name' => 'tampered-mesh',
                'type' => SkateboardComponent::TYPE_WHEELS,
            ])
            ->assertRedirect();

        $component->refresh();
        $this->assertSame(SkateboardComponent::GLB_BOARD, $component->glb_file);
        $this->assertSame('original-mesh', $component->mesh_name);
        $this->assertSame(SkateboardComponent::TYPE_DECK, $component->type);
    }
}
