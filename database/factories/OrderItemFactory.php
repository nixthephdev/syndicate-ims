<?php

namespace Database\Factories;

use App\Contracts\Purchasable;
use App\Models\Order;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\OrderItem>
 */
class OrderItemFactory extends Factory
{
    public function definition()
    {
        $quantity = fake()->numberBetween(1, 3);
        $unitPrice = fake()->numberBetween(45000, 250000);

        return [
            'order_id' => Order::factory(),
            'purchasable_type' => ProductVariant::class,
            'purchasable_id' => ProductVariant::factory(),
            'name_snapshot' => fake()->words(3, true),
            'unit_price_centavos' => $unitPrice,
            'quantity' => $quantity,
            'line_total_centavos' => $unitPrice * $quantity,
            'customization' => null,
        ];
    }

    /**
     * Point the line at a real purchasable, snapshotting its name and price
     * the way checkout does.
     *
     * @param  Purchasable&Model  $item
     */
    public function for_(Purchasable $item, int $quantity = 1)
    {
        return $this->state(fn () => [
            'purchasable_type' => $item->getMorphClass(),
            'purchasable_id' => $item->getKey(),
            'name_snapshot' => $item->displayName(),
            'unit_price_centavos' => $item->currentPriceCentavos(),
            'quantity' => $quantity,
            'line_total_centavos' => $item->currentPriceCentavos() * $quantity,
        ]);
    }
}
