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

    /**
     * A build's trucks and standalone trucks are the same product but
     * different cart entries, and the line key has to say so.
     *
     * Keyed on class+id alone they collided: adding trucks from /parts while
     * a custom board (which always includes trucks) sat in the cart merged
     * into the board's line. No new row appeared — the board's price just
     * quietly went up — and the board's "every member shares one quantity"
     * invariant broke, so its stepper would then overwrite the quantity the
     * standalone add had paid for.
     */
    public function test_adding_a_part_standalone_does_not_merge_into_a_custom_build(): void
    {
        $user = User::factory()->create();
        $deck = SkateboardComponent::factory()->deck()->create(['stock' => 10]);
        $wheels = SkateboardComponent::factory()->wheels()->create(['stock' => 10]);
        $trucks = SkateboardComponent::factory()->trucks()->create(['stock' => 10]);
        $bolts = SkateboardComponent::factory()->bolts()->create(['stock' => 10]);

        $this->actingAs($user);

        // A custom board — deck + wheels + the trucks and bolts that always
        // come with it, all sharing one build_key.
        $this->post(route('customize.store'), [
            'deck_id' => $deck->id,
            'wheels_id' => $wheels->id,
        ])->assertSessionHasNoErrors();

        $beforeSubtotal = app(Cart::class)->subtotalCentavos();

        // Now buy a set of trucks on their own from /parts.
        $this->post(route('cart.store'), [
            'type' => 'component',
            'id' => $trucks->id,
            'quantity' => 1,
        ])->assertSessionHasNoErrors();

        $lines = app(Cart::class)->lines();

        // Five lines now: the build's four, plus a standalone trucks line.
        $this->assertCount(5, $lines);

        $standalone = array_values(array_filter(
            $lines,
            fn ($line) => $line['id'] === $trucks->id && $line['build_key'] === null
        ));
        $inBuild = array_values(array_filter(
            $lines,
            fn ($line) => $line['id'] === $trucks->id && $line['build_key'] !== null
        ));

        $this->assertCount(1, $standalone, 'the standalone trucks line is missing');
        $this->assertCount(1, $inBuild, "the build's own trucks line is missing");

        // Each keeps quantity 1 — neither absorbed the other.
        $this->assertSame(1, $standalone[0]['quantity']);
        $this->assertSame(1, $inBuild[0]['quantity']);

        // And the shopper is charged for exactly one extra set of trucks.
        $this->assertSame(
            $beforeSubtotal + $trucks->price_centavos,
            app(Cart::class)->subtotalCentavos()
        );

        // The build is still one board, not two.
        $this->assertSame($bolts->id, $bolts->fresh()->id);
        $this->assertCount(
            4,
            array_filter($lines, fn ($line) => $line['build_key'] !== null)
        );
    }

    /**
     * A cart already sitting in a session when this deployed holds build
     * lines under the old `class#id` key. Those must be re-keyed on read, or
     * the shopper keeps hitting the collision until they empty their cart.
     */
    public function test_a_cart_stored_under_the_old_key_format_is_migrated(): void
    {
        $user = User::factory()->create();
        $trucks = SkateboardComponent::factory()->trucks()->create(['stock' => 10]);

        $this->actingAs($user);

        // Exactly what the old Cart::add() would have written.
        session()->put('cart', [
            SkateboardComponent::class.'#'.$trucks->id => [
                'type' => SkateboardComponent::class,
                'id' => $trucks->id,
                'quantity' => 1,
                'build_key' => 'legacy-build-key',
                'color' => null,
            ],
        ]);

        // Reading is enough to re-key it.
        app(Cart::class)->lines();

        $this->assertArrayHasKey(
            SkateboardComponent::class.'#'.$trucks->id.'#legacy-build-key',
            session()->get('cart')
        );

        // And a standalone add of the same part is now its own line.
        $this->post(route('cart.store'), [
            'type' => 'component',
            'id' => $trucks->id,
            'quantity' => 1,
        ])->assertSessionHasNoErrors();

        $this->assertCount(2, app(Cart::class)->lines());
    }

    /** Two separate builds stay two entries, even sharing a deck. */
    public function test_two_builds_of_the_same_parts_do_not_merge(): void
    {
        $user = User::factory()->create();
        $deck = SkateboardComponent::factory()->deck()->create(['stock' => 10]);
        $wheels = SkateboardComponent::factory()->wheels()->create(['stock' => 10]);
        SkateboardComponent::factory()->trucks()->create(['stock' => 10]);
        SkateboardComponent::factory()->bolts()->create(['stock' => 10]);

        $this->actingAs($user);

        foreach ([1, 2] as $ignored) {
            $this->post(route('customize.store'), [
                'deck_id' => $deck->id,
                'wheels_id' => $wheels->id,
            ]);
        }

        $buildKeys = array_unique(array_filter(
            array_column(app(Cart::class)->lines(), 'build_key')
        ));

        $this->assertCount(2, $buildKeys, 'the second board merged into the first');
    }
}
