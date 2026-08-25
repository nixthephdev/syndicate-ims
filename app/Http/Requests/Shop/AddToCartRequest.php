<?php

namespace App\Http\Requests\Shop;

use App\Services\Cart;
use Illuminate\Foundation\Http\FormRequest;

class AddToCartRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Guests may fill a cart; checkout is where auth bites.
    }

    /**
     * `type` is an alias ("variant"), never a class name. The request must not
     * be able to name an arbitrary class for the app to instantiate.
     */
    public function rules(): array
    {
        return [
            'type' => ['required', 'string', 'in:'.implode(',', array_keys(Cart::PURCHASABLE_TYPES))],
            'id' => ['required', 'integer', 'min:1'],
            // Capped: without an upper bound a shopper can put 100000 tees in
            // the cart and the checkout page has to render every line.
            'quantity' => ['required', 'integer', 'min:1', 'max:20'],
        ];
    }

    public function messages(): array
    {
        return [
            'quantity.max' => 'For orders over 20 pieces, message the shop directly.',
        ];
    }
}
