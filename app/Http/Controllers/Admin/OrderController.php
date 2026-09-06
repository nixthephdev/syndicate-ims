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
                'fulfillment_method' => $order->fulfillment_method,
                'payment_method' => $order->payment_method,
                'payment_method_label' => $order->paymentMethodLabel(),
                'requires_deposit' => $order->requiresDeposit(),
                'needs_payment_proof' => $order->needsPaymentProof(),
                'payment_reference' => $order->payment_reference,
                'payment_proof_uploaded_at' => $order->payment_proof_uploaded_at?->format('d M Y, g:ia'),
                'payment_proof_url' => $order->hasPaymentProof()
                    ? route('payment.proof.show', $order->order_number)
                    : null,
                // The buyer's ID, shown next to the order so staff review
                // both in one pass — it does NOT gate ordering.
                'customer_id_verification' => $order->user ? [
                    'user_id' => $order->user->id,
                    'status' => $order->user->id_verification_status,
                    'id_type_label' => $order->user->idTypeLabel(),
                    'submitted_at' => $order->user->id_submitted_at?->format('d M Y, g:ia'),
                    'photo_url' => $order->user->id_photo_path
                        ? route('verify-id.photo', $order->user)
                        : null,
                ] : null,
                // Where the order physically is — see Order::trackingPayload().
                // Null until stock is committed; there's nothing to track yet.
                'tracking' => $order->trackingPayload(),
                'subtotal_formatted' => Money::format($order->subtotal_centavos),
                'total_formatted' => Money::format($order->total_centavos),
                'deposit_formatted' => $order->deposit_centavos !== null ? Money::format($order->deposit_centavos) : null,
                'balance_formatted' => $order->balanceCentavos() !== null ? Money::format($order->balanceCentavos()) : null,
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
                'account' => $order->user ? [
                    'name' => $order->user->name,
                    'email' => $order->user->email,
                    'role' => $order->user->role,
                ] : null,
                'placed_at' => $order->created_at->format('d M Y, g:ia'),
                'paid_at' => $order->paid_at?->format('d M Y, g:ia'),
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
                'fulfil' => in_array($order->status, [Order::STATUS_PAID, Order::STATUS_DEPOSIT_PAID], true),
                'cancel' => $order->status === Order::STATUS_AWAITING_PAYMENT,
                // Staff confirm EVERY method now — there is no gateway doing
                // it for them. Only the status matters, not how they paid.
                'confirm_payment' => $order->status === Order::STATUS_AWAITING_PAYMENT,
            ],
        ]);
    }
}
