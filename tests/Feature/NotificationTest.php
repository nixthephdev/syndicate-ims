<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use App\Notifications\OrderUpdated;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The bell's endpoints (client, 2026-10-31), and the customer half of it:
 * moving an order along tells the customer whose order it is.
 */
class NotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_moving_an_order_along_notifies_its_customer(): void
    {
        $customer = User::factory()->create();
        $order = Order::factory()->create([
            'user_id' => $customer->id,
            'status' => Order::STATUS_PAID,
            'paid_at' => now(),
            'fulfillment_method' => Order::FULFILLMENT_DELIVERY,
        ]);

        $this->actingAs(User::factory()->staff()->create())
            ->patch(route('admin.orders.fulfillment.update', $order->order_number), ['stage' => 'preparing'])
            ->assertSessionHasNoErrors();

        $this->actingAs($customer)
            ->getJson(route('notifications.index'))
            ->assertOk()
            ->assertJsonPath('unread', 1)
            ->assertJsonPath('items.0.title', 'Order '.$order->order_number)
            ->assertJsonPath('items.0.message', 'Preparing your order.');
    }

    public function test_each_user_sees_only_their_own_and_can_mark_them_read(): void
    {
        $mine = User::factory()->create();
        $theirs = User::factory()->create();
        $order = Order::factory()->create(['user_id' => $mine->id]);
        $mine->notify(new OrderUpdated($order, 'One.'));
        $mine->notify(new OrderUpdated($order, 'Two.'));
        $theirs->notify(new OrderUpdated($order, 'Not yours.'));

        $this->actingAs($mine)->getJson(route('notifications.index'))->assertJsonPath('unread', 2)->assertJsonCount(2, 'items');

        $one = $mine->notifications()->first()->id;
        $this->postJson(route('notifications.read'), ['id' => $one])->assertJsonPath('unread', 1);
        $this->postJson(route('notifications.read'))->assertJsonPath('unread', 0);

        $this->assertSame(1, $theirs->unreadNotifications()->count());
    }

    public function test_guests_get_nothing(): void
    {
        $this->getJson(route('notifications.index'))->assertUnauthorized();
    }

    public function test_the_address_dropdowns_serve_a_provinces_real_cities(): void
    {
        $this->getJson(route('address.cities', ['province' => 'Albay']))
            ->assertOk()
            ->assertJsonCount(18)
            ->assertJsonFragment(['name' => 'Daraga']);

        $this->getJson(route('address.cities', ['province' => 'Atlantis']))->assertNotFound();
    }
}
