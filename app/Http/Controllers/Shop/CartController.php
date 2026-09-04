<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Http\Requests\Shop\AddToCartRequest;
use App\Services\Cart;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CartController extends Controller
{
    private Cart $cart;

    public function __construct(Cart $cart)
    {
        $this->cart = $cart;
    }

    public function index(): Response
    {
        return Inertia::render('Storefront/Cart', [
            'lines' => $this->cart->lines(),
            'subtotal_centavos' => $this->cart->subtotalCentavos(),
        ]);
    }

    public function store(AddToCartRequest $request): RedirectResponse
    {
        $class = Cart::classForAlias($request->validated('type'));

        // Active-only: an archived variant must not be addable by posting its
        // id directly, even though it may still appear on old orders.
        $item = $class::query()
            ->where('is_active', true)
            ->find($request->validated('id'));

        if (! $item) {
            return back()->withErrors(['cart' => 'That item is no longer available.']);
        }

        if ($item->isOutOfStock()) {
            return back()->withErrors(['cart' => 'That one is sold out.']);
        }

        $this->cart->add($item, (int) $request->validated('quantity'), null, $request->validated('color'));

        return back()->with('success', $item->displayName().' added to your cart.');
    }

    /**
     * Accepts either a single `key` (one line — apparel, the common case) or
     * a `keys` array (every line of one custom skateboard build, so its one
     * cart-page quantity stepper can set all four parts together). Either
     * way it's just a loop into Cart::update() per key — the grouping is
     * purely a cart-page presentation concern, Cart itself has no concept of
     * "set these together."
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'key' => ['required_without:keys', 'nullable', 'string'],
            'keys' => ['required_without:key', 'nullable', 'array', 'min:1'],
            'keys.*' => ['string'],
            'quantity' => ['required', 'integer', 'min:0', 'max:20'],
        ]);

        foreach ($validated['keys'] ?? [$validated['key']] as $key) {
            $this->cart->update($key, (int) $validated['quantity']);
        }

        return back();
    }

    public function destroy(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'key' => ['required_without:keys', 'nullable', 'string'],
            'keys' => ['required_without:key', 'nullable', 'array', 'min:1'],
            'keys.*' => ['string'],
        ]);

        foreach ($validated['keys'] ?? [$validated['key']] as $key) {
            $this->cart->remove($key);
        }

        return back()->with('success', 'Removed from your cart.');
    }
}
