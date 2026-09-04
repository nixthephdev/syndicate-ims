<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Models\Order;
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
                'subtotal_centavos' => $order->subtotal_centavos,
                'total_centavos' => $order->total_centavos,
                'customer_name' => $order->customer_name,
                'customer_email' => $order->customer_email,
                'customer_phone' => $order->customer_phone,
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
}
