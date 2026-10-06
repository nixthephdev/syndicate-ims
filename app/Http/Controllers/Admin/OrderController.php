<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\SkateboardComponent;
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

        $orders = Order::query()->asOfNow()
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
                'awaiting_payment' => Order::query()->asOfNow()->status(Order::STATUS_AWAITING_PAYMENT)->count(),
                'paid' => Order::query()->asOfNow()->status(Order::STATUS_PAID)->count(),
                'fulfilled' => Order::query()->asOfNow()->status(Order::STATUS_FULFILLED)->count(),
            ],
        ]);
    }

    public function show(string $orderNumber): Response
    {
        $order = Order::query()
            ->where('order_number', $orderNumber)
            ->with(['items.purchasable', 'user:id,name,email,role'])
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
                'pays_online' => $order->paysOnline(),
                // PayMongo's own ids — what staff search for in the PayMongo
                // dashboard if a customer disputes a payment.
                'paymongo' => array_filter([
                    'payment_intent_id' => $order->paymongo_payment_intent_id,
                    'payment_id' => $order->paymongo_payment_id,
                ]),
                // Each custom board as one 3D model — see builds() below.
                'builds' => $this->builds($order),
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
                // Cash only — PayMongo confirms GCash. See OrderPaymentController.
                'confirm_payment' => $order->status === Order::STATUS_AWAITING_PAYMENT
                    && $order->payment_method === Order::PAYMENT_METHOD_CASH,
            ],
        ]);
    }

    /**
     * The order's skateboard parts, regrouped into the boards they make up,
     * so the page can show each as one assembled 3D model rather than four
     * rows of text.
     *
     * Grouped on the build_key checkout snapshots into `customization`. Parts
     * bought on their own (no build_key, and every order placed before the
     * key was snapshotted) fall into one "Separate parts" group, previewed
     * together.
     *
     * mesh_name is read off the live component, not a snapshot: it is
     * immutable (the admin edit form never writes it — it is what the .glb
     * lookup keys on), so it cannot have drifted since the order was placed.
     *
     * @return array<int, array<string, mixed>>
     */
    private function builds(Order $order): array
    {
        $groups = [];

        foreach ($order->items as $item) {
            $part = $item->purchasable;

            if (! $part instanceof SkateboardComponent) {
                continue;
            }

            $key = $item->customization['build_key'] ?? 'loose';
            $groups[$key] ??= [
                'key' => $key,
                'label' => $key === 'loose' ? 'Separate parts' : 'Custom board',
                'deck_mesh' => null,
                'wheels_mesh' => null,
                'trucks_color' => null,
                'bolts_color' => null,
                'parts' => [],
            ];

            // ponytail: a "Separate parts" group with two decks previews the
            // first one only; split into one model per deck if that matters.
            $slot = [
                SkateboardComponent::TYPE_DECK => 'deck_mesh',
                SkateboardComponent::TYPE_WHEELS => 'wheels_mesh',
            ][$part->type] ?? null;

            if ($slot) {
                $groups[$key][$slot] ??= $part->mesh_name;
            }

            $color = [
                SkateboardComponent::TYPE_TRUCKS => 'trucks_color',
                SkateboardComponent::TYPE_BOLTS => 'bolts_color',
            ][$part->type] ?? null;

            if ($color) {
                $groups[$key][$color] ??= $item->customization['color'] ?? null;
            }

            $groups[$key]['parts'][] = $item->name_snapshot;
        }

        return array_values($groups);
    }
}
