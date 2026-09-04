<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Support\Money;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Staff-side order management — objectives 6 and 10.
 *
 * Read plus a narrow status transition (see OrderStatusController). Nothing
 * here writes stock: stock is InventoryService's alone, and by the time an
 * order reaches this screen its stock has either been committed at payment or
 * never will be.
 */
class OrderController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->query('status');
        $status = in_array($status, Order::STATUSES, true) ? $status : null;

        $orders = Order::query()
            ->with('user:id,name,email')
            ->withCount('items')
            ->when($status, fn ($query) => $query->status($status))
            ->when($request->query('q'), function ($query, $term) {
                $query->where(function ($q) use ($term) {
                    $q->where('order_number', 'like', "%{$term}%")
                        ->orWhere('customer_name', 'like', "%{$term}%")
                        ->orWhere('customer_email', 'like', "%{$term}%");
                });
            })
            ->latest()
            // Orders grow without bound; the product list can get away with
            // ->get() because a shop has tens of products, not tens of
            // thousands of orders.
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Order $order) => [
                'order_number' => $order->order_number,
                'status' => $order->status,
                'customer_name' => $order->customer_name,
                'customer_email' => $order->customer_email,
                'items_count' => $order->items_count,
                'total_formatted' => Money::format($order->total_centavos),
                'placed_at' => $order->created_at->format('d M Y, g:ia'),
                'paid_at' => $order->paid_at?->format('d M Y, g:ia'),
            ]);

        return Inertia::render('Admin/Orders/Index', [
            'orders' => $orders,
            'filters' => [
                'status' => $status,
                'q' => $request->query('q'),
            ],
            'statuses' => Order::STATUSES,
            'counts' => [
                'awaiting_payment' => Order::query()->status(Order::STATUS_AWAITING_PAYMENT)->count(),
                'paid' => Order::query()->status(Order::STATUS_PAID)->count(),
                'fulfilled' => Order::query()->status(Order::STATUS_FULFILLED)->count(),
            ],
        ]);
    }

    public function show(string $orderNumber): Response
    {
        $order = Order::query()
            ->where('order_number', $orderNumber)
            ->with(['items', 'user:id,name,email,role'])
            ->firstOrFail();

        return Inertia::render('Admin/Orders/Show', [
            'order' => [
                'order_number' => $order->order_number,
                'status' => $order->status,
                'is_paid' => $order->isPaid(),
                'stock_committed' => $order->stockIsCommitted(),
                'subtotal_formatted' => Money::format($order->subtotal_centavos),
                'total_formatted' => Money::format($order->total_centavos),
                'customer_name' => $order->customer_name,
                'customer_email' => $order->customer_email,
                'customer_phone' => $order->customer_phone,
                'notes' => $order->notes,
                'account' => $order->user ? [
                    'name' => $order->user->name,
                    'email' => $order->user->email,
                    'role' => $order->user->role,
                ] : null,
                'placed_at' => $order->created_at->format('d M Y, g:ia'),
                'paid_at' => $order->paid_at?->format('d M Y, g:ia'),
                'paymongo' => array_filter([
                    'payment_intent_id' => $order->paymongo_payment_intent_id,
                    'source_id' => $order->paymongo_source_id,
                    'payment_id' => $order->paymongo_payment_id,
                ]),
                'items' => $order->items->map(fn ($item) => [
                    // Snapshots, deliberately — never the live product record.
                    'name' => $item->name_snapshot,
                    'unit_price_formatted' => Money::format($item->unit_price_centavos),
                    'quantity' => $item->quantity,
                    'line_total_formatted' => Money::format($item->line_total_centavos),
                    // /parts hardware colour swatch, if one was picked at
                    // checkout — see Cart::add()/CheckoutController::store().
                    'color' => $item->customization['color'] ?? null,
                ]),
            ],
            'can' => [
                'fulfil' => $order->status === Order::STATUS_PAID,
                'cancel' => $order->status === Order::STATUS_AWAITING_PAYMENT,
            ],
        ]);
    }
}
