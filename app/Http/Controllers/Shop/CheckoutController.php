<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Http\Requests\Shop\CheckoutRequest;
use App\Models\Order;
use App\Models\OrderItem;
use App\Services\Cart;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Turns a cart into an order.
 *
 * This does NOT touch stock. The order is created `awaiting_payment`; stock
 * only moves when payment is confirmed, through InventoryService. That split
 * is the core project rule — see CLAUDE.md.
 */
class CheckoutController extends Controller
{
    private Cart $cart;

    public function __construct(Cart $cart)
    {
        $this->cart = $cart;
    }

    public function create(): Response|RedirectResponse
    {
        if ($this->cart->isEmpty()) {
            return redirect()->route('shop.index');
        }

        $user = request()->user();

        return Inertia::render('Storefront/Checkout', [
            'lines' => $this->cart->lines(),
            'subtotal_centavos' => $this->cart->subtotalCentavos(),
            // Prefill from the account so a returning customer isn't retyping.
            'defaults' => [
                'customer_name' => $user->name,
                'customer_email' => $user->email,
            ],
        ]);
    }

    public function store(CheckoutRequest $request): RedirectResponse
    {
        $lines = $this->cart->lines();

        if ($lines === []) {
            return redirect()->route('shop.index');
        }

        // Advisory pre-check so an obviously impossible order fails here with
        // a useful message rather than at payment. NOT the real guard — the
        // authoritative check happens behind a row lock in InventoryService,
        // because nothing reserves stock between now and payment.
        $short = array_filter($lines, fn ($line) => $line['exceeds_stock']);

        if ($short !== []) {
            return back()->withErrors([
                'cart' => 'Someone got there first: '
                    .implode(', ', array_column($short, 'name'))
                    .' no longer has enough stock. Adjust your cart and try again.',
            ]);
        }

        $order = DB::transaction(function () use ($request, $lines) {
            $subtotal = array_sum(array_column($lines, 'line_total_centavos'));

            $order = Order::create([
                'order_number' => Order::generateOrderNumber(),
                'user_id' => $request->user()->id,
                'status' => Order::STATUS_AWAITING_PAYMENT,
                'subtotal_centavos' => $subtotal,
                // No shipping or tax yet — when either lands, total stops
                // equalling subtotal and this is the line that changes.
                'total_centavos' => $subtotal,
                'customer_name' => $request->validated('customer_name'),
                'customer_email' => $request->validated('customer_email'),
                'customer_phone' => $request->validated('customer_phone'),
                'notes' => $request->validated('notes'),
            ]);

            foreach ($lines as $line) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'purchasable_type' => Cart::classForAlias($line['type']),
                    'purchasable_id' => $line['id'],
                    // Snapshots. An order must always render as what was
                    // bought, even after the product is renamed or repriced.
                    'name_snapshot' => $line['name'],
                    'unit_price_centavos' => $line['unit_price_centavos'],
                    'quantity' => $line['quantity'],
                    'line_total_centavos' => $line['line_total_centavos'],
                    // /parts hardware colour swatch, if one was picked — see
                    // Cart::add()'s docblock. This is the one real use of
                    // this column today; /customize's own colour picker
                    // stays decorative-only and never reaches a cart line.
                    'customization' => $line['color'] ? ['color' => $line['color']] : null,
                ]);
            }

            return $order;
        });

        $this->cart->clear();

        return redirect()->route('orders.show', $order->order_number);
    }
}
