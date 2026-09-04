<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Http\Requests\Shop\AddCustomBuildToCartRequest;
use App\Models\SkateboardComponent;
use App\Services\Cart;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The 3D skateboard builder — deck + wheels picked by the shopper, trucks and
 * bolts included automatically. Objective 1/2 territory: 360°/zoom preview
 * and mesh-visibility-toggle customization over the client's baked .glb
 * variants (see public/models/README.md — this is not free colour assembly).
 *
 * Route name `customize` is load-bearing: StoreHeader's nav lights this chip
 * up automatically via route().has('customize'). Do not rename the route.
 */
class CustomizeController extends Controller
{
    private Cart $cart;

    public function __construct(Cart $cart)
    {
        $this->cart = $cart;
    }

    public function index(): Response
    {
        $decks = SkateboardComponent::query()
            ->active()
            ->ofType(SkateboardComponent::TYPE_DECK)
            ->orderBy('name')
            ->get();

        $wheels = SkateboardComponent::query()
            ->active()
            ->ofType(SkateboardComponent::TYPE_WHEELS)
            ->orderBy('name')
            ->get();

        // Hardware isn't picker-driven — only one active row of each is
        // expected to exist (see SkateboardComponentSeeder) — but the page
        // must not assume that forever. If staff deactivate the only row, or
        // a fresh env just hasn't been seeded yet, the builder still works
        // with deck+wheels alone rather than 500ing.
        $trucks = SkateboardComponent::query()
            ->active()
            ->ofType(SkateboardComponent::TYPE_TRUCKS)
            ->first();

        $bolts = SkateboardComponent::query()
            ->active()
            ->ofType(SkateboardComponent::TYPE_BOLTS)
            ->first();

        return Inertia::render('Storefront/Customize', [
            'decks' => $decks->map(fn ($c) => $this->option($c)),
            'wheels' => $wheels->map(fn ($c) => $this->option($c)),
            'trucks' => $trucks ? $this->option($trucks) : null,
            'bolts' => $bolts ? $this->option($bolts) : null,
        ]);
    }

    public function store(AddCustomBuildToCartRequest $request): RedirectResponse
    {
        $deck = SkateboardComponent::query()
            ->active()
            ->ofType(SkateboardComponent::TYPE_DECK)
            ->find($request->validated('deck_id'));

        $wheels = SkateboardComponent::query()
            ->active()
            ->ofType(SkateboardComponent::TYPE_WHEELS)
            ->find($request->validated('wheels_id'));

        if (! $deck || ! $wheels) {
            return back()->withErrors(['cart' => 'That build is no longer available.']);
        }

        $trucks = SkateboardComponent::query()
            ->active()
            ->ofType(SkateboardComponent::TYPE_TRUCKS)
            ->first();

        $bolts = SkateboardComponent::query()
            ->active()
            ->ofType(SkateboardComponent::TYPE_BOLTS)
            ->first();

        // All four checked before any of them is added — a custom build is
        // one purchase decision from the shopper's side (one click, one
        // price), so it is reject-all-or-add-all, never a partial build
        // silently sitting in the cart because one piece ran out mid-add.
        $outOfStock = $deck->isOutOfStock()
            || $wheels->isOutOfStock()
            || ($trucks && $trucks->isOutOfStock())
            || ($bolts && $bolts->isOutOfStock());

        if ($outOfStock) {
            return back()->withErrors(['cart' => 'One of those parts just sold out.']);
        }

        // One build_key ties all four lines together purely for cart-page
        // display (see Cart::add()'s docblock) — checkout still creates one
        // OrderItem per line, so each part's stock still decrements on its
        // own.
        $buildKey = (string) Str::uuid();

        $this->cart->add($deck, 1, $buildKey);
        $this->cart->add($wheels, 1, $buildKey);

        if ($trucks) {
            $this->cart->add($trucks, 1, $buildKey);
        }

        if ($bolts) {
            $this->cart->add($bolts, 1, $buildKey);
        }

        return back()->with('success', 'Your custom build was added to the cart.');
    }

    /**
     * One shape, used identically by the picker UI (name/price/stock) and
     * the 3D scene (glb_file/mesh_name) — not two overlapping props for the
     * same component.
     */
    private function option(SkateboardComponent $component): array
    {
        return [
            'id' => $component->id,
            'name' => $component->name,
            'price_centavos' => $component->price_centavos,
            'mesh_name' => $component->mesh_name,
            'glb_file' => $component->glb_file,
            'stock' => $component->stock,
            'is_low_stock' => $component->isLowStock() && ! $component->isOutOfStock(),
            'is_out_of_stock' => $component->isOutOfStock(),
        ];
    }
}
