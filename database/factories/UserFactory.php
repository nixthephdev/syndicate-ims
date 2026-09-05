<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
            'remember_token' => Str::random(10),
            'role' => User::ROLE_CUSTOMER,
            // ID-verified by default, deliberately. A factory should produce
            // an account that can do the normal things, and ID verification
            // now gates every order — defaulting to `none` would make dozens
            // of unrelated checkout/payment/cart tests fail for a reason none
            // of them are about. The gate itself is tested through the
            // explicit states below, where the status is the actual subject.
            'id_verification_status' => User::ID_STATUS_APPROVED,
        ];
    }

    /** Never submitted an ID — what a freshly registered account really is. */
    public function unverifiedId()
    {
        return $this->state(fn () => [
            'id_verification_status' => User::ID_STATUS_NONE,
            'id_type' => null,
            'id_photo_path' => null,
        ]);
    }

    /** Submitted, waiting on a human. Still cannot order. */
    public function pendingId()
    {
        return $this->state(fn () => [
            'id_verification_status' => User::ID_STATUS_PENDING,
            'id_type' => 'philsys',
            'id_photo_path' => 'private-ids/test-placeholder.jpg',
            'id_submitted_at' => now(),
        ]);
    }

    public function rejectedId()
    {
        return $this->state(fn () => [
            'id_verification_status' => User::ID_STATUS_REJECTED,
            'id_type' => 'philsys',
            'id_photo_path' => 'private-ids/test-placeholder.jpg',
            'id_submitted_at' => now()->subDay(),
            'id_reviewed_at' => now(),
            'id_rejection_reason' => 'The photo is too blurry to read.',
        ]);
    }

    public function admin()
    {
        return $this->state(fn (array $attributes) => ['role' => User::ROLE_ADMIN]);
    }

    public function staff()
    {
        return $this->state(fn (array $attributes) => ['role' => User::ROLE_STAFF]);
    }

    /**
     * Indicate that the model's email address should be unverified.
     *
     * @return static
     */
    public function unverified()
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
