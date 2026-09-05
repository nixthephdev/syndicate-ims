<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    /** The customer's own order history (objective 10's customer half). */
    public function index(Request $request): Response
    {
        $orders = Order::query()
            ->where('user_id', $request->user()->id)
            ->withCount('items')
            ->latest()
            ->get()
            ->map(fn (Order $order) => [
                'order_number' => $order->order_number,
                'status' => $order->status,
                'total_centavos' => $order->total_centavos,
                'items_count' => $order->items_count,
                'placed_at' => $order->created_at->toDayDateTimeString(),
                'paid_at' => $order->paid_at?->toDayDateTimeString(),
            ]);

        return Inertia::render('Storefront/Orders/Index', [
            'orders' => $orders,
        ]);
    }

    public function show(Request $request, string $orderNumber): Response
    {
        $order = Order::query()
            ->where('order_number', $orderNumber)
            ->with('items')
            ->firstOrFail();

        // Ownership check. The order number is guessable enough that reading
        // someone else's receipt must not come down to knowing the URL.
        // Staff and admin can see any order.
        // isStaff() is the hierarchical helper — it admits admin too.
        abort_unless(
            $order->user_id === $request->user()->id || $request->user()->isStaff(),
            403
        );

        return Inertia::render('Storefront/Orders/Show', [
            'order' => [
                'order_number' => $order->order_number,
                'status' => $order->status,
                'is_paid' => $order->isPaid(),
                'fulfillment_method' => $order->fulfillment_method,
                'payment_method' => $order->payment_method,
                'deposit_centavos' => $order->deposit_centavos,
                'balance_centavos' => $order->balanceCentavos(),
                // Real PayMongo integration is only usable once real test
                // keys are configured — see PayMongoController. Until then
                // the storefront falls back to the local/testing-only stub
                // (Shop\PaymentController), same as before this existed.
                'payment_configured' => filled(config('services.paymongo.secret_key')),
                // Self-service cancel — see cancel() below. Owner-only,
                // deliberately not offered to staff viewing someone else's
                // order here; they have the admin panel's own transition for
                // that.
                'can_cancel' => $order->status === Order::STATUS_AWAITING_PAYMENT
                    && $order->user_id === $request->user()->id,
                // Address is a much lower-stakes edit than cancel — no stock
                // or money involved — so it stays open a little longer: any
                // time before the order is handed over or called off.
                'can_change_address' => ! in_array($order->status, [Order::STATUS_FULFILLED, Order::STATUS_CANCELLED], true)
                    && $order->user_id === $request->user()->id,
                'subtotal_centavos' => $order->subtotal_centavos,
                'total_centavos' => $order->total_centavos,
                'customer_name' => $order->customer_name,
                'customer_email' => $order->customer_email,
                'customer_phone' => $order->customer_phone,
                'address' => [
                    'address_line' => $order->address_line,
                    'barangay' => $order->barangay,
                    'city' => $order->city,
                    'province' => $order->province,
                    'postal_code' => $order->postal_code,
                    'has_address' => $order->hasAddress(),
                ],
                'notes' => $order->notes,
                'placed_at' => $order->created_at->toDayDateTimeString(),
                'paid_at' => $order->paid_at?->toDayDateTimeString(),
                'items' => $order->items->map(fn ($item) => [
                    'name' => $item->name_snapshot,
                    'unit_price_centavos' => $item->unit_price_centavos,
                    'quantity' => $item->quantity,
                    'line_total_centavos' => $item->line_total_centavos,
                    // /parts hardware colour swatch, if one was picked at
                    // checkout — see Cart::add()/CheckoutController::store().
                    'color' => $item->customization['color'] ?? null,
                ]),
            ],
        ]);
    }

    /**
     * Customer self-service cancel — order-level, so it needs no
     * skateboard/apparel-specific handling. Deliberately as narrow as
     * Admin\OrderStatusController's own awaiting_payment -> cancelled move:
     * nothing has been paid or committed yet, so there is no stock to put
     * back and no money to refund. Cancelling a PAID order is a different,
     * bigger feature (needs a real refund/restock path with its own audit
     * trail) and is not what this endpoint does — see that controller's
     * docblock for why that transition stays admin-only and unbuilt.
     *
     * Owner-only, no staff bypass: this is the customer acting on their own
     * order, not a general order-management action. Staff already have the
     * admin panel's own (identical) transition for support cases.
     */
    public function cancel(Request $request, string $orderNumber): RedirectResponse
    {
        $order = Order::query()->where('order_number', $orderNumber)->firstOrFail();

        abort_unless($order->user_id === $request->user()->id, 403);

        if ($order->status !== Order::STATUS_AWAITING_PAYMENT) {
            return back()->withErrors([
                'order' => 'This order can no longer be cancelled.',
            ]);
        }

        $order->status = Order::STATUS_CANCELLED;
        $order->save();

        return back()->with('success', $order->order_number.' has been cancelled.');
    }

    /**
     * Customer self-service address add/change. No stock or money is
     * involved, so this stays open longer than cancel() does — any time
     * before the order is fulfilled or cancelled, not just pre-payment.
     * Owner-only, same reasoning as cancel(): staff act through the admin
     * panel, not this endpoint, on someone else's order.
     */
    public function updateAddress(Request $request, string $orderNumber): RedirectResponse
    {
        $order = Order::query()->where('order_number', $orderNumber)->firstOrFail();

        abort_unless($order->user_id === $request->user()->id, 403);

        if (in_array($order->status, [Order::STATUS_FULFILLED, Order::STATUS_CANCELLED], true)) {
            return back()->withErrors([
                'order' => 'This order\'s address can no longer be changed.',
            ]);
        }

        $validated = $request->validate([
            'address_line' => ['nullable', 'string', 'max:255'],
            'barangay' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'province' => ['nullable', 'string', 'max:255'],
            'postal_code' => ['nullable', 'string', 'max:10'],
        ]);

        $order->fill($validated);
        $order->save();

        return back()->with('success', 'Address updated.');
    }
}
