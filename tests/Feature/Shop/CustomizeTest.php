<?php

namespace Tests\Feature\Shop;

use App\Models\SkateboardComponent;
use App\Services\Cart;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * The 3D builder's backend: the page's data contract with the 3D scene and
 * picker UI, and the atomic add-to-cart action. Nothing here can test the
 * actual Three.js rendering — no JS test runner exists in this project —
 * only that the server side of the contract is correct.
 */
class CustomizeTest extends TestCase
{
    use RefreshDatabase;

    public function test_customize_route_is_named_customize(): void
    {
        // Load-bearing for StoreHeader's route().has('customize') nav chip —
        // a silent rename here would leave that chip permanently dimmed.
        $this->assertTrue(Route::has('customize'));

        $this->get(route('customize'))->assertOk();
    }

    public function test_customize_page_renders_active_decks_and_wheels(): void
    {
        SkateboardComponent::factory()->deck()->create(['name' => 'Active Deck']);
        SkateboardComponent::factory()->deck()->create(['name' => 'Retired Deck', 'is_active' => false]);
        SkateboardComponent::factory()->wheels()->create(['name' => 'Wheel A']);
        SkateboardComponent::factory()->wheels()->create(['name' => 'Wheel B']);

        $this->get(route('customize'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Storefront/Customize')
                ->has('decks', 1)
                ->where('decks.0.name', 'Active Deck')
                ->has('wheels', 2)
            );
    }

    public function test_customize_page_includes_mesh_name_and_glb_file(): void
    {
        SkateboardComponent::factory()->deck()->create([
            'name' => 'Abstract Deck',
            'mesh_name' => 'abstract',
            'glb_file' => SkateboardComponent::GLB_BOARD,
        ]);

        $this->get(route('customize'))
            ->assertInertia(fn ($page) => $page
                ->where('decks.0.mesh_name', 'abstract')
                ->where('decks.0.glb_file', SkateboardComponent::GLB_BOARD)
            );
    }

    public function test_customize_page_includes_price_and_stock_flags(): void
    {
        SkateboardComponent::factory()->deck()->create([
            'price_centavos' => 280000,
            'stock' => 2,
            'low_stock_threshold' => 3,
        ]);

        $this->get(route('customize'))
            ->assertInertia(fn ($page) => $page
                ->where('decks.0.price_centavos', 280000)
                ->where('decks.0.stock', 2)
                ->where('decks.0.is_low_stock', true)
                ->where('decks.0.is_out_of_stock', false)
            );
    }

    public function test_customize_page_renders_without_trucks_or_bolts_seeded(): void
    {
        SkateboardComponent::factory()->deck()->create();
        SkateboardComponent::factory()->wheels()->create();
        // No Trucks/Bolts rows at all.

        $this->get(route('customize'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('trucks', null)
                ->where('bolts', null)
            );
    }

    public function test_add_custom_build_adds_all_four_components_to_cart(): void
    {
        $deck = SkateboardComponent::factory()->deck()->create();
        $wheels = SkateboardComponent::factory()->wheels()->create();
        SkateboardComponent::factory()->trucks()->create();
        SkateboardComponent::factory()->bolts()->create();

        $this->post(route('customize.store'), [
            'deck_id' => $deck->id,
            'wheels_id' => $wheels->id,
        ])->assertSessionHasNoErrors();

        $this->assertSame(4, $this->cartLineCount());
    }

    public function test_add_custom_build_works_without_trucks_or_bolts_seeded(): void
    {
        $deck = SkateboardComponent::factory()->deck()->create();
        $wheels = SkateboardComponent::factory()->wheels()->create();

        $this->post(route('customize.store'), [
            'deck_id' => $deck->id,
            'wheels_id' => $wheels->id,
        ])->assertSessionHasNoErrors();

        $this->assertSame(2, $this->cartLineCount());
    }

    public function test_add_custom_build_rejects_when_deck_is_out_of_stock(): void
    {
        $deck = SkateboardComponent::factory()->deck()->outOfStock()->create();
        $wheels = SkateboardComponent::factory()->wheels()->create();

        $this->post(route('customize.store'), [
            'deck_id' => $deck->id,
            'wheels_id' => $wheels->id,
        ])->assertSessionHasErrors('cart');

        $this->assertSame(0, $this->cartLineCount());
    }

    /**
     * Mirrors the deck test exactly. A check-order bug (e.g. only ever
     * validating the deck) could otherwise let a sold-out wheel set through
     * silently — this pins that both sides are actually checked.
     */
    public function test_add_custom_build_rejects_when_wheels_is_out_of_stock(): void
    {
        $deck = SkateboardComponent::factory()->deck()->create();
        $wheels = SkateboardComponent::factory()->wheels()->outOfStock()->create();

        $this->post(route('customize.store'), [
            'deck_id' => $deck->id,
            'wheels_id' => $wheels->id,
        ])->assertSessionHasErrors('cart');

        $this->assertSame(0, $this->cartLineCount());
    }

    public function test_add_custom_build_rejects_when_deck_is_inactive(): void
    {
        $deck = SkateboardComponent::factory()->deck()->create(['is_active' => false]);
        $wheels = SkateboardComponent::factory()->wheels()->create();

        $this->post(route('customize.store'), [
            'deck_id' => $deck->id,
            'wheels_id' => $wheels->id,
        ])
            ->assertSessionHasErrors('cart')
            ->assertSessionDoesntHaveErrors('deck_id');

        $this->assertSame(0, $this->cartLineCount());
    }

    public function test_add_custom_build_rejects_missing_deck_id(): void
    {
        $wheels = SkateboardComponent::factory()->wheels()->create();

        $this->post(route('customize.store'), [
            'wheels_id' => $wheels->id,
        ])->assertSessionHasErrors('deck_id');

        $this->assertSame(0, $this->cartLineCount());
    }

    /**
     * There is no trucks/bolts picker on the page — the request accepts only
     * deck_id/wheels_id. A client-supplied trucks_id must be silently
     * ignored, not read; the server-resolved single active row is what
     * actually gets added.
     */
    public function test_add_custom_build_ignores_client_supplied_trucks_id(): void
    {
        $deck = SkateboardComponent::factory()->deck()->create();
        $wheels = SkateboardComponent::factory()->wheels()->create();
        $realTrucks = SkateboardComponent::factory()->trucks()->create(['name' => 'Real Trucks']);
        $otherComponent = SkateboardComponent::factory()->deck()->create(['name' => 'Not Trucks At All']);

        $this->post(route('customize.store'), [
            'deck_id' => $deck->id,
            'wheels_id' => $wheels->id,
            'trucks_id' => $otherComponent->id,
        ])->assertSessionHasNoErrors();

        $lines = app(Cart::class)->lines();
        $names = array_column($lines, 'name');

        $this->assertContains('Real Trucks', $names);
        $this->assertNotContains('Not Trucks At All', $names);
    }

    private function cartLineCount(): int
    {
        return count(app(Cart::class)->lines());
    }
}
