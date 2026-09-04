<?php

namespace Tests\Feature\Shop;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Philippine delivery address, collected at checkout and editable
 * afterwards — see Shop\OrderController::updateAddress()'s docblock for why
 * this stays open longer than cancel() does (no stock or money involved).
 */
class OrderAddressTest extends TestCase
{
    use RefreshDatabase;

    private function fillCartWithOneVariant(User $user): void
    {
        $product = Product::factory()->create([
            'is_active' => true,
            'base_price_centavos' => 50000,
        ]);

        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'size' => 'M',
            'color' => 'Black',
            'stock' => 10,
            'price_centavos' => null,
            'is_active' => true,
        ]);

        $this->actingAs($user);
        $this->post(route('cart.store'), [
            'type' => 'variant',
            'id' => $variant->id,
            'quantity' => 1,
        ]);
    }

    private function checkoutDetails(array $overrides = []): array
    {
        return array_merge([
            'customer_name' => 'Juan Dela Cruz',
            'customer_email' => 'juan@example.test',
            'customer_phone' => '0917 123 4567',
        ], $overrides);
    }

    public function test_checkout_stores_the_address_when_given(): void
    {
        $user = User::factory()->create();
        $this->fillCartWithOneVariant($user);

        $this->post(route('checkout.store'), $this->checkoutDetails([
            'address_line' => '123 Rizal St.',
            'barangay' => 'Tagas',
            'city' => 'Daraga',
            'province' => 'Albay',
            'postal_code' => '4501',
        ]))->assertSessionHasNoErrors();

        $order = Order::firstOrFail();

        $this->assertSame('123 Rizal St.', $order->address_line);
        $this->assertSame('Tagas', $order->barangay);
        $this->assertSame('Daraga', $order->city);
        $this->assertSame('Albay', $order->province);
        $this->assertSame('4501', $order->postal_code);
        $this->assertTrue($order->hasAddress());
    }

    public function test_checkout_works_with_no_address_pickup_orders(): void
    {
        $user = User::factory()->create();
        $this->fillCartWithOneVariant($user);

        $this->post(route('checkout.store'), $this->checkoutDetails())
            ->assertSessionHasNoErrors();

        $order = Order::firstOrFail();

        $this->assertNull($order->address_line);
        $this->assertFalse($order->hasAddress());
    }

    public function test_a_customer_can_add_an_address_after_checkout(): void
    {
        $user = User::factory()->create();
        $this->fillCartWithOneVariant($user);
        $this->post(route('checkout.store'), $this->checkoutDetails());
        $order = Order::firstOrFail();

        $this->actingAs($user)
            ->patch(route('orders.address.update', $order->order_number), [
                'address_line' => '456 Bonifacio Ave.',
                'barangay' => 'Rawis',
                'city' => 'Legazpi City',
                'province' => 'Albay',
                'postal_code' => '4500',
            ])
            ->assertSessionHasNoErrors();

        $order->refresh();
        $this->assertSame('456 Bonifacio Ave.', $order->address_line);
        $this->assertSame('Legazpi City', $order->city);
    }

    public function test_a_customer_can_change_the_address_after_paying(): void
    {
        $user = User::factory()->create();
        $this->fillCartWithOneVariant($user);
        $this->post(route('checkout.store'), $this->checkoutDetails());
        $order = Order::firstOrFail();

        $this->actingAs($user);
        $this->post(route('payment.confirm', $order->order_number));
        $this->assertSame(Order::STATUS_PAID, $order->fresh()->status);

        $this->patch(route('orders.address.update', $order->order_number), [
            'city' => 'Legazpi City',
        ])->assertSessionHasNoErrors();

        $this->assertSame('Legazpi City', $order->fresh()->city);
    }

    public function test_the_address_cannot_be_changed_once_fulfilled(): void
    {
        $user = User::factory()->create();
        $this->fillCartWithOneVariant($user);
        $this->post(route('checkout.store'), $this->checkoutDetails());
        $order = Order::firstOrFail();

        $this->actingAs($user);
        $this->post(route('payment.confirm', $order->order_number));
        $order->update(['status' => Order::STATUS_FULFILLED]);

        $this->patch(route('orders.address.update', $order->order_number), [
            'city' => 'Legazpi City',
        ])->assertSessionHasErrors('order');

        $this->assertNull($order->fresh()->city);
    }

    public function test_the_address_cannot_be_changed_once_cancelled(): void
    {
        $user = User::factory()->create();
        $this->fillCartWithOneVariant($user);
        $this->post(route('checkout.store'), $this->checkoutDetails());
        $order = Order::firstOrFail();

        $this->actingAs($user);
        $this->post(route('orders.cancel', $order->order_number));

        $this->patch(route('orders.address.update', $order->order_number), [
            'city' => 'Legazpi City',
        ])->assertSessionHasErrors('order');
    }

    public function test_a_customer_cannot_change_someone_elses_address(): void
    {
        $owner = User::factory()->create();
        $this->fillCartWithOneVariant($owner);
        $this->post(route('checkout.store'), $this->checkoutDetails());
        $order = Order::firstOrFail();

        $this->actingAs(User::factory()->create())
            ->patch(route('orders.address.update', $order->order_number), [
                'city' => 'Legazpi City',
            ])
            ->assertForbidden();

        $this->assertNull($order->fresh()->city);
    }

    public function test_staff_cannot_use_the_customer_address_endpoint(): void
    {
        $user = User::factory()->create();
        $this->fillCartWithOneVariant($user);
        $this->post(route('checkout.store'), $this->checkoutDetails());
        $order = Order::firstOrFail();

        $this->actingAs(User::factory()->staff()->create())
            ->patch(route('orders.address.update', $order->order_number), [
                'city' => 'Legazpi City',
            ])
            ->assertForbidden();
    }

    public function test_guests_are_redirected_to_login(): void
    {
        $user = User::factory()->create();
        $this->fillCartWithOneVariant($user);
        $this->post(route('checkout.store'), $this->checkoutDetails());
        $order = Order::firstOrFail();

        auth()->logout();

        $this->patch(route('orders.address.update', $order->order_number), [
            'city' => 'Legazpi City',
        ])->assertRedirect(route('login'));
    }
}
