<?php

namespace Tests\Feature\Shop;

use App\Models\SkateboardComponent;
use App\Models\User;
use App\Services\Cart;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Buying a single skateboard part on its own, separate from the /customize
 * builder — see PartController. Read-only browsing plus reuse of the
 * existing cart.store pipe, so most of what needs pinning here is "this
 * really is the same add-to-cart path apparel uses," not new machinery.
 */
class PartBrowsingTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_browse_parts_with_no_account(): void
    {
        SkateboardComponent::factory()->deck()->create();

        $this->get(route('parts.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Storefront/Parts/Index'));
    }

    public function test_only_active_decks_and_wheels_are_listed(): void
    {
        SkateboardComponent::factory()->deck()->create(['name' => 'Active Deck']);
        SkateboardComponent::factory()->deck()->create(['name' => 'Retired Deck', 'is_active' => false]);
        SkateboardComponent::factory()->wheels()->create(['name' => 'Wheel A']);
        SkateboardComponent::factory()->wheels()->create(['name' => 'Wheel B', 'is_active' => false]);

        $this->get(route('parts.index'))
            ->assertInertia(fn ($page) => $page
                ->has('decks', 1)
                ->where('decks.0.name', 'Active Deck')
                ->has('wheels', 1)
                ->where('wheels.0.name', 'Wheel A')
            );
    }

    public function test_trucks_and_bolts_render_as_single_items_not_lists(): void
    {
        SkateboardComponent::factory()->trucks()->create(['name' => 'Standard Trucks']);
        SkateboardComponent::factory()->bolts()->create(['name' => 'Mounting Bolts']);

        $this->get(route('parts.index'))
            ->assertInertia(fn ($page) => $page
                ->where('trucks.name', 'Standard Trucks')
                ->where('bolts.name', 'Mounting Bolts')
            );
    }

    public function test_page_renders_without_trucks_or_bolts_seeded(): void
    {
        SkateboardComponent::factory()->deck()->create();

        $this->get(route('parts.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('trucks', null)
                ->where('bolts', null)
            );
    }

    public function test_a_logged_in_customer_can_add_a_single_part_to_the_cart(): void
    {
        $user = User::factory()->create();
        $wheels = SkateboardComponent::factory()->wheels()->create(['stock' => 10]);

        $this->actingAs($user)
            ->post(route('cart.store'), ['type' => 'component', 'id' => $wheels->id, 'quantity' => 1])
            ->assertSessionHasNoErrors();

        $lines = app(Cart::class)->lines();

        $this->assertCount(1, $lines);
        // Ordinary standalone purchase — never grouped like a customize
        // build (see CustomizeTest::test_add_custom_build_tags_all_lines...).
        $this->assertNull($lines[0]['build_key']);
    }

    public function test_a_guest_adding_a_part_is_redirected_to_login(): void
    {
        $wheels = SkateboardComponent::factory()->wheels()->create(['stock' => 10]);

        $this->post(route('cart.store'), ['type' => 'component', 'id' => $wheels->id, 'quantity' => 1])
            ->assertRedirect(route('login', ['reason' => 'cart']));
    }

    /**
     * The /parts hardware colour swatch (Trucks/Bolts) is preview-only —
     * there's still one SKU, one price, one stock count — but it must still
     * reach the cart line so the shop knows what colour was requested. See
     * App\Services\Cart::add()'s docblock.
     */
    public function test_adding_a_hardware_part_with_a_colour_stores_it_on_the_cart_line(): void
    {
        $user = User::factory()->create();
        $trucks = SkateboardComponent::factory()->trucks()->create(['stock' => 10]);

        $this->actingAs($user)
            ->post(route('cart.store'), [
                'type' => 'component',
                'id' => $trucks->id,
                'quantity' => 1,
                'color' => '#E7312F',
            ])
            ->assertSessionHasNoErrors();

        $lines = app(Cart::class)->lines();

        $this->assertSame('#E7312F', $lines[0]['color']);
    }

    public function test_adding_a_part_without_a_colour_leaves_it_null(): void
    {
        $user = User::factory()->create();
        $wheels = SkateboardComponent::factory()->wheels()->create(['stock' => 10]);

        $this->actingAs($user)
            ->post(route('cart.store'), ['type' => 'component', 'id' => $wheels->id, 'quantity' => 1])
            ->assertSessionHasNoErrors();

        $lines = app(Cart::class)->lines();

        $this->assertNull($lines[0]['color']);
    }

    public function test_a_malformed_colour_is_rejected(): void
    {
        $user = User::factory()->create();
        $trucks = SkateboardComponent::factory()->trucks()->create(['stock' => 10]);

        $this->actingAs($user)
            ->post(route('cart.store'), [
                'type' => 'component',
                'id' => $trucks->id,
                'quantity' => 1,
                'color' => 'not-a-hex-color',
            ])
            ->assertSessionHasErrors('color');
    }
}
