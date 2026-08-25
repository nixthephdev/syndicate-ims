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

        $this->cart->add($item, (int) $request->validated('quantity'));

        return back()->with('success', $item->displayName().' added to your cart.');
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'key' => ['required', 'string'],
            'quantity' => ['required', 'integer', 'min:0', 'max:20'],
        ]);

        $this->cart->update($validated['key'], (int) $validated['quantity']);

        return back();
    }

    public function destroy(Request $request): RedirectResponse
    {
        $validated = $request->validate(['key' => ['required', 'string']]);

        $this->cart->remove($validated['key']);

        return back()->with('success', 'Removed from your cart.');
    }
}
