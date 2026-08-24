<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Order>
 */
class OrderFactory extends Factory
{
    public function definition()
    {
        $subtotal = fake()->numberBetween(50000, 500000);

        return [
            'order_number' => Order::generateOrderNumber(),
            'user_id' => User::factory(),
            'status' => Order::STATUS_PENDING,
            'subtotal_centavos' => $subtotal,
            'total_centavos' => $subtotal,
            'customer_name' => fake()->name(),
            'customer_email' => fake()->unique()->safeEmail(),
            'customer_phone' => fake()->numerify('09#########'),
            'paid_at' => null,
        ];
    }

    public function pending()
    {
        return $this->state(fn () => [
            'status' => Order::STATUS_PENDING,
            'paid_at' => null,
        ]);
    }

    public function awaitingPayment()
    {
        return $this->state(fn () => [
            'status' => Order::STATUS_AWAITING_PAYMENT,
            'paid_at' => null,
        ]);
    }

    /** Already-committed order — use to assert the idempotency guard. */
    public function paid()
    {
        return $this->state(fn () => [
            'status' => Order::STATUS_PAID,
            'paid_at' => now(),
        ]);
    }
}
