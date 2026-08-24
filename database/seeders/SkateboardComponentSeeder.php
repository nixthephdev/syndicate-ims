<?php

namespace Database\Seeders;

use App\Models\SkateboardComponent;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * The real asset contract, as data.
 *
 * Every row here corresponds to an actual named mesh inside one of the
 * client's two .glb files. Mesh names were read out of
 * reference/skate-demo/main.js — they are NOT invented, and changing one
 * silently breaks the customizer's mesh lookup.
 *
 * Prices are placeholders in CENTAVOS pending the shop owner's real price list.
 */
class SkateboardComponentSeeder extends Seeder
{
    /** board.glb — 14 decks, keyed by mesh name => shop-facing label. */
    private const DECKS = [
        'abstract' => 'Abstract',
        'clash' => 'Clash',
        'moon' => 'Moon',
        'neonpalmtree' => 'Synth Wave',
        'ogre' => 'Ogre',
        'spicy' => 'Spicy',
        'tiedye' => 'Tie-dye',
        'syndicateBLACK' => 'Black Syndicate',
        'syndicateBLUE' => 'Blue Syndicate',
        'syndicateGREEN' => 'Green Syndicate',
        'syndicatePURPLE' => 'Purple Syndicate',
        'syndicateRED' => 'Red Syndicate',
        'syndicateWHITE' => 'White Syndicate',
        'syndicateYELLOW' => 'Yellow Syndicate',
    ];

    /** wheels.glb — 3 designs x 6 colours. Meshes are <name>1 / <name>2 pairs. */
    private const WHEEL_SERIES = ['bb' => 'BB', 'eye' => 'Eye', 'star' => 'Star'];

    private const WHEEL_COLORS = ['BLUE', 'GREEN', 'PURPLE', 'RED', 'WHITE', 'YELLOW'];

    /** board.glb also contains these two shared hardware meshes. */
    private const HARDWARE = [
        'Trucks' => [SkateboardComponent::TYPE_TRUCKS, 'Standard Trucks', 200000],
        'Bolts' => [SkateboardComponent::TYPE_BOLTS, 'Mounting Bolts', 30000],
    ];

    public function run(): void
    {
        foreach (self::DECKS as $mesh => $label) {
            $this->component(
                SkateboardComponent::TYPE_DECK,
                $label.' Deck',
                SkateboardComponent::GLB_BOARD,
                $mesh,
                280000
            );
        }

        foreach (self::WHEEL_SERIES as $prefix => $seriesLabel) {
            foreach (self::WHEEL_COLORS as $color) {
                $this->component(
                    SkateboardComponent::TYPE_WHEELS,
                    sprintf('%s Wheels — %s', $seriesLabel, Str::title($color)),
                    SkateboardComponent::GLB_WHEELS,
                    $prefix.$color,
                    150000
                );
            }
        }

        foreach (self::HARDWARE as $mesh => [$type, $label, $price]) {
            $this->component($type, $label, SkateboardComponent::GLB_BOARD, $mesh, $price);
        }
    }

    private function component(
        string $type,
        string $name,
        string $glbFile,
        string $meshName,
        int $priceCentavos
    ): void {
        // Idempotent: re-running the seeder must not duplicate or reset stock.
        SkateboardComponent::firstOrCreate(
            ['glb_file' => $glbFile, 'mesh_name' => $meshName],
            [
                'type' => $type,
                'name' => $name,
                'slug' => Str::slug($name),
                'price_centavos' => $priceCentavos,
                'stock' => 10,
                'low_stock_threshold' => 3,
                'is_active' => true,
            ]
        );
    }
}
