<?php

namespace App\Http\Controllers\Shop;

use App\Exceptions\InsufficientStockException;
use App\Models\Order;
use App\Http\Controllers\Controller;
use App\Services\InventoryService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * TEMPORARY payment confirmation — the seam PayMongo's webhook will replace.
 *
 * The real Phase 6 flow is: redirect to PayMongo → customer pays with GCash →
 * PayMongo POSTs a webhook → that handler calls InventoryService exactly as
 * this does. Everything downstream of `commitForPaidOrder()` is already final;
 * only the trigger is stubbed.
 *
 * This exists now because without it InventoryService — the atomic
 * stock-commit service that objective 3 rests on — is unreachable from the
 * running app, and an inventory system nobody can demonstrate decrementing
 * stock is not a demonstration of anything.
 *
 * Blocked outside local/testing. A route that marks orders paid for free must
 * never be reachable on the deployed site.
 */
class PaymentController extends Controller
{
    public function confirm(Request $request, string $orderNumber, InventoryService $inventory): RedirectResponse
    {
        abort_unless(app()->environment(['local', 'testing']), 404);

        $order = Order::query()
            ->where('order_number', $orderNumber)
            ->with('items')
            ->firstOrFail();

        abort_unless($order->user_id === $request->user()->id, 403);

        if ($order->stockIsCommitted()) {
            return back()->with('success', 'That order is already paid.');
        }

        try {
            $inventory->commitForPaidOrder($order);
        } catch (InsufficientStockException $e) {
            // The whole transaction rolled back: the order is untouched and no
            // stock moved. This is the race the project accepts by not
            // reserving stock in the cart — the loser gets a clear failure.
            return back()->withErrors([
                'payment' => 'Payment could not be completed — '.$e->getMessage()
                    .' Nothing was charged.',
            ]);
        }

        return back()->with('success', 'Payment confirmed. Stock has been updated.');
    }
}
