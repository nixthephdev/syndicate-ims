<?php

namespace Database\Factories;

use App\Models\SkateboardComponent;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\SkateboardComponent>
 */
class SkateboardComponentFactory extends Factory
{
    public function definition()
    {
        $name = fake()->unique()->words(2, true);

        return [
            'type' => SkateboardComponent::TYPE_DECK,
            'name' => Str::title($name),
            'slug' => Str::slug($name),
            'glb_file' => SkateboardComponent::GLB_BOARD,
            'mesh_name' => 'mesh'.fake()->unique()->numberBetween(1, 100000),
            'price_centavos' => fake()->numberBetween(150000, 400000),
            'stock' => fake()->numberBetween(5, 40),
            'low_stock_threshold' => 5,
            'is_active' => true,
        ];
    }

    public function deck()
    {
        return $this->state(fn () => [
            'type' => SkateboardComponent::TYPE_DECK,
            'glb_file' => SkateboardComponent::GLB_BOARD,
        ]);
    }

    public function wheels()
    {
        return $this->state(fn () => [
            'type' => SkateboardComponent::TYPE_WHEELS,
            'glb_file' => SkateboardComponent::GLB_WHEELS,
        ]);
    }

    public function withStock(int $stock)
    {
        return $this->state(fn () => ['stock' => $stock]);
    }

    public function outOfStock()
    {
        return $this->state(fn () => ['stock' => 0]);
    }
}
