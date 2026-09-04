<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Models\SkateboardComponent;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Buying a single skateboard part on its own — a deck, just wheels, trucks,
 * or bolts — without going through the /customize 3D builder. The client
 * asked for this explicitly; the storefront footer already advertised
 * "Decks & completes" / "Wheels & trucks" as shop categories before this
 * page existed to back them.
 *
 * Read-only, same as Shop\ProductController — nothing here writes stock.
 * Add to Cart on this page posts straight to the existing cart.store route
 * with type=component; no new purchase machinery needed.
 */
class PartController extends Controller
{
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

        // Singletons by design — see SkateboardComponentSeeder. Rendered as
        // a compact fixed pair on the page, not a one-card "section" that
        // would look like a broken empty grid next to Decks/Wheels.
        $trucks = SkateboardComponent::query()
            ->active()
            ->ofType(SkateboardComponent::TYPE_TRUCKS)
            ->first();

        $bolts = SkateboardComponent::query()
            ->active()
            ->ofType(SkateboardComponent::TYPE_BOLTS)
            ->first();

        return Inertia::render('Storefront/Parts/Index', [
            'decks' => $decks->map(fn ($c) => $this->card($c)),
            'wheels' => $wheels->map(fn ($c) => $this->card($c)),
            'trucks' => $trucks ? $this->card($trucks) : null,
            'bolts' => $bolts ? $this->card($bolts) : null,
        ]);
    }

    private function card(SkateboardComponent $component): array
    {
        $hasColorVariants = in_array($component->type, [
            SkateboardComponent::TYPE_TRUCKS,
            SkateboardComponent::TYPE_BOLTS,
        ], true);

        return [
            'id' => $component->id,
            'name' => $component->name,
            'slug' => $component->slug,
            'type' => $component->type,
            'type_label' => SkateboardComponent::TYPE_LABELS[$component->type] ?? $component->type,
            'price_centavos' => $component->price_centavos,
            'stock' => $component->stock,
            'is_low_stock' => $component->isLowStock() && ! $component->isOutOfStock(),
            'is_out_of_stock' => $component->isOutOfStock(),
            // Trucks/Bolts don't have a plain image — only per-colour ones
            // (see below) — so `image` is only meaningful for Decks/Wheels.
            'image' => $hasColorVariants ? null : $this->imageUrl($component),
            // mesh_name is exposed here (never elsewhere in this payload)
            // purely so the frontend can build `board-{mesh_name}-{hex}.png`
            // paths itself, off the ONE real colour list already living in
            // Components/Customizer/hardwareColors.js — not duplicated as a
            // second PHP constant that could drift from it.
            'mesh_name' => $hasColorVariants ? $component->mesh_name : null,
            'has_color_variants' => $hasColorVariants,
        ];
    }

    /**
     * Real renders of the actual baked mesh graphic — see
     * public/images/parts/README.md for how they were generated. Path is
     * derived purely from glb_file + mesh_name (already immutable, load-
     * bearing data — see SkateboardComponent's docblock), never a stored
     * column, so there's nothing extra to keep in sync. A missing file
     * (any part someone forgets to regenerate for) falls back to PartCard's
     * existing placeholder block instead of a broken <img>.
     */
    private function imageUrl(SkateboardComponent $component): ?string
    {
        $prefix = $component->glb_file === SkateboardComponent::GLB_WHEELS ? 'wheels' : 'board';
        $relative = "images/parts/{$prefix}-{$component->mesh_name}.png";

        return file_exists(public_path($relative)) ? "/{$relative}" : null;
    }
}
