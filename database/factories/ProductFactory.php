<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    public function definition()
    {
        $name = fake()->unique()->words(3, true);

        return [
            'name' => Str::title($name),
            'slug' => Str::slug($name),
            'description' => fake()->sentence(12),
            'category' => Product::CATEGORY_APPAREL,
            // Centavos. ₱450–₱2,500 is a realistic apparel range for the shop.
            'base_price_centavos' => fake()->numberBetween(45000, 250000),
            'image_path' => null,
            'is_active' => true,
        ];
    }

    public function apparel()
    {
        return $this->state(fn () => ['category' => Product::CATEGORY_APPAREL]);
    }

    public function skateboard()
    {
        return $this->state(fn () => [
            'category' => Product::CATEGORY_SKATEBOARD,
            'base_price_centavos' => fake()->numberBetween(250000, 700000),
        ]);
    }

    public function inactive()
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
