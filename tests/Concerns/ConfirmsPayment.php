<?php

namespace Tests\Concerns;

use App\Models\Order;
use App\Models\User;
use App\Services\InventoryService;

/**
 * "Make this order paid" for tests whose subject is something else — an
 * address change, a cancellation, a fulfillment stage.
 *
 * There used to be a customer-facing stub route (payment.confirm) that did
 * this, which was convenient but also fiction: with PayMongo gone, the ONLY
 * thing that marks an order paid is a staff member confirming it in the
 * admin panel. This goes through the same InventoryService that controller
 * uses, so tests stay honest about stock moving, without every one of them
 * having to log in as staff and drive the admin UI.
 *
 * Tests that are actually ABOUT payment confirmation should hit
 * `admin.orders.payment.confirm` for real instead of using this.
 */
trait ConfirmsPayment
{
    private function markPaid(Order $order): Order
    {
        return app(InventoryService::class)->commitForPaidOrder(
            $order->fresh()->load('items'),
            $order->paidStatusForPaymentMethod()
        );
    }

    /** The real thing: staff pressing confirm in the admin panel. */
    private function staffConfirmsPayment(Order $order, ?User $staff = null)
    {
        return $this->actingAs($staff ?? User::factory()->staff()->create())
            ->patch(route('admin.orders.payment.confirm', $order->order_number));
    }
}
