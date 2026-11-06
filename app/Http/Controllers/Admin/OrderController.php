<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductVariant;
use App\Models\SkateboardComponent;
use App\Support\Money;
use Illuminate\Database\Eloquent\Relations\MorphTo;
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
            ->with([
                // withTrashed: an archived product's photo is still the
                // right reference picture for an order placed before that.
                'items.purchasable' => fn (MorphTo $morph) => $morph->morphWith([
                    ProductVariant::class => ['product' => fn ($q) => $q->withTrashed()],
                ]),
                'user:id,name,email,role',
            ])
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
                    // The second payment on a 50% deposit order.
                    'balance_payment_id' => $order->balance_payment_id,
                ]),
                'balance_paid_at' => $order->balance_paid_at?->format('d M Y, g:ia'),
                // A pickup order with the balance unpaid can't be handed over
                // — the page says why instead of offering the button.
                'balance_blocks_handover' => $order->balanceBlocksHandover(),
                // Each custom board as one 3D model — see builds() below.
                'builds' => $this->builds($order),
                // Each apparel line's product photo — the 2D counterpart of
                // the 3D boards, so staff pick the right item off the rack.
                'apparel' => $this->apparel($order),
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
                    'image_url' => $this->imageFor($item),
                ]),
            ],
            'can' => [
                'fulfil' => in_array($order->status, [Order::STATUS_PAID, Order::STATUS_DEPOSIT_PAID], true)
                    && ! $order->balanceBlocksHandover(),
                'cancel' => $order->status === Order::STATUS_AWAITING_PAYMENT,
            ],
        ]);
    }

    /**
     * The picture for one order line: the product photo for apparel, the
     * part render for a skateboard part. Read off the live record — photos
     * are reference, not a priced snapshot, and they are never deleted on
     * replace (see Admin\ProductController), so an old path still resolves.
     */
    private function imageFor(OrderItem $item): ?string
    {
        $part = $item->purchasable;

        if ($part instanceof ProductVariant) {
            return $part->product?->image_path;
        }

        if ($part instanceof SkateboardComponent) {
            return $part->imageUrl(strtolower(ltrim($item->customization['color'] ?? 'f8f8f8', '#')));
        }

        return null;
    }

    /**
     * Apparel lines as reference cards: photo, the exact size and colour to
     * pull, and how many. Skateboard parts are left to builds(), which
     * shows them assembled instead.
     *
     * @return array<int, array<string, mixed>>
     */
    private function apparel(Order $order): array
    {
        return $order->items
            ->filter(fn (OrderItem $item) => $item->purchasable instanceof ProductVariant)
            ->map(fn (OrderItem $item) => [
                'name' => $item->purchasable->product?->name ?? $item->name_snapshot,
                'size' => $item->purchasable->size,
                'color' => $item->purchasable->color,
                'quantity' => $item->quantity,
                'image_url' => $this->imageFor($item),
            ])
            ->values()
            ->all();
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
                'download_parts' => [],
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
            $groups[$key]['download_parts'][] = [
                'id' => $item->id,
                'name' => $item->name_snapshot,
                'type' => $part->type,
                'mesh' => $part->mesh_name,
                'color' => $item->customization['color'] ?? null,
            ];
        }

        return array_values($groups);
    }
}
