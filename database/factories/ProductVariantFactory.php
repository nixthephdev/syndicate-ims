<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ProductVariant>
 */
class ProductVariantFactory extends Factory
{
    public function definition()
    {
        return [
            'product_id' => Product::factory(),
            'size' => fake()->randomElement(['XS', 'S', 'M', 'L', 'XL', '2XL']),
            'color' => fake()->randomElement(['Black', 'White', 'Red', 'Blue', 'Green']),
            'sku' => 'SYN-'.strtoupper(fake()->unique()->bothify('??##??##')),
            // Null means inherit the product's base price.
            'price_centavos' => null,
            'stock' => fake()->numberBetween(5, 60),
            'low_stock_threshold' => 5,
            'is_active' => true,
        ];
    }

    public function withStock(int $stock)
    {
        return $this->state(fn () => ['stock' => $stock]);
    }

    public function outOfStock()
    {
        return $this->state(fn () => ['stock' => 0]);
    }

    public function lowStock()
    {
        return $this->state(fn () => ['stock' => 2, 'low_stock_threshold' => 5]);
    }
}
