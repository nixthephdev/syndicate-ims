<?php

namespace Tests\Concerns;

use App\Models\Order;
use App\Services\InventoryService;

/**
 * "Make this order paid" for tests whose subject is something else — an
 * address change, a cancellation, a fulfillment stage.
 *
 * Goes through the same InventoryService PayMongo's confirmation uses
 * (Shop\PayMongoController::settle()), so tests stay honest about stock
 * moving without every one of them faking a PayMongo round trip. Tests that
 * are actually ABOUT confirming a payment live in PayMongoReturnTest.
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
}
