<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Http\Requests\Shop\CheckoutRequest;
use App\Mail\OtpCodeMail;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OtpCode;
use App\Services\Cart;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Turns a cart into an order.
 *
 * This does NOT touch stock. The order is created `awaiting_payment`; stock
 * only moves when payment is confirmed, through InventoryService. That split
 * is the core project rule — see CLAUDE.md.
 *
 * store() no longer creates the order directly — it validates the form,
 * stashes it in the session, and requires an emailed OTP (otpStore()) before
 * anything is actually created. The cart itself already lives in the
 * session, so only the typed form fields need stashing alongside it.
 */
class CheckoutController extends Controller
{
    private const SESSION_KEY = 'pending_checkout';

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

        if (! OtpCode::issueAndSend($request->user(), OtpCode::PURPOSE_CHECKOUT)) {
            return back()->withErrors([
                'cart' => "We couldn't send your confirmation code right now. "
                    .'Your cart is untouched — please try again in a moment.',
            ]);
        }

        $request->session()->put(self::SESSION_KEY, $request->validated());

        return redirect()->route('checkout.otp.create');
    }

    public function otpCreate(Request $request): Response|RedirectResponse
    {
        if (! $request->session()->has(self::SESSION_KEY)) {
            return redirect()->route('checkout.create');
        }

        return Inertia::render('Storefront/CheckoutOtp');
    }

    public function otpStore(Request $request): RedirectResponse
    {
        $data = $request->session()->get(self::SESSION_KEY);

        abort_unless($data, 403);

        $request->validate(['code' => ['required', 'string']]);

        $otp = OtpCode::currentFor($request->user()->id, OtpCode::PURPOSE_CHECKOUT);

        if (! $otp || ! $otp->attempt($request->input('code'))) {
            return back()->withErrors([
                'code' => 'That code is incorrect or has expired.',
            ]);
        }

        $lines = $this->cart->lines();

        if ($lines === []) {
            $request->session()->forget(self::SESSION_KEY);

            return redirect()->route('shop.index');
        }

        // Re-checked: the cart can change while someone is typing in a code.
        $short = array_filter($lines, fn ($line) => $line['exceeds_stock']);

        if ($short !== []) {
            $request->session()->forget(self::SESSION_KEY);

            return redirect()->route('checkout.create')->withErrors([
                'cart' => 'Someone got there first: '
                    .implode(', ', array_column($short, 'name'))
                    .' no longer has enough stock. Adjust your cart and try again.',
            ]);
        }

        $order = DB::transaction(function () use ($data, $lines, $request) {
            $subtotal = array_sum(array_column($lines, 'line_total_centavos'));

            // Both default rather than being required — see CheckoutRequest's
            // docblock — so every caller that predates this split (existing
            // tests included) still produces a plain pickup+gcash order.
            $fulfillment = $data['fulfillment_method'] ?? Order::FULFILLMENT_PICKUP;
            $isDelivery = $fulfillment === Order::FULFILLMENT_DELIVERY;

            // Delivery is always the 50% deposit flow — never trust the
            // client to have sent (or not sent) a payment_method for this;
            // pickup keeps whatever the customer actually chose (default
            // gcash for the same backward-compatibility reason as above).
            $paymentMethod = $isDelivery
                ? Order::PAYMENT_METHOD_GCASH_DEPOSIT
                : ($data['payment_method'] ?? Order::PAYMENT_METHOD_GCASH);

            // ceil(), not round() or intdiv(): deposit + balance must always
            // equal the total exactly, and rounding the deposit UP is what
            // guarantees that (any leftover centavo lands in the deposit,
            // never silently dropped from either half).
            $deposit = $isDelivery ? (int) ceil($subtotal / 2) : null;

            $order = Order::create([
                'order_number' => Order::generateOrderNumber(),
                'user_id' => $request->user()->id,
                'status' => Order::STATUS_AWAITING_PAYMENT,
                'fulfillment_method' => $fulfillment,
                'payment_method' => $paymentMethod,
                'subtotal_centavos' => $subtotal,
                // No shipping or tax yet — when either lands, total stops
                // equalling subtotal and this is the line that changes.
                'total_centavos' => $subtotal,
                'deposit_centavos' => $deposit,
                'customer_name' => $data['customer_name'],
                'customer_email' => $data['customer_email'],
                'customer_phone' => $data['customer_phone'],
                'address_line' => $data['address_line'] ?? null,
                'barangay' => $data['barangay'] ?? null,
                'city' => $data['city'] ?? null,
                'province' => $data['province'] ?? null,
                'postal_code' => $data['postal_code'] ?? null,
                'notes' => $data['notes'] ?? null,
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
        $request->session()->forget(self::SESSION_KEY);

        return redirect()->route('orders.show', $order->order_number);
    }

    public function otpResend(Request $request): RedirectResponse
    {
        abort_unless($request->session()->has(self::SESSION_KEY), 403);

        if (! OtpCode::issueAndSend($request->user(), OtpCode::PURPOSE_CHECKOUT)) {
            return back()->withErrors([
                'code' => "We couldn't send that code right now. Please try again in a moment.",
            ]);
        }

        return back()->with('success', 'A new code has been sent.');
    }
}
