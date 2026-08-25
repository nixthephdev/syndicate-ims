<?php

namespace App\Http\Requests\Shop;

use Illuminate\Foundation\Http\FormRequest;

class AddCustomBuildToCartRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Guests may fill a cart; checkout is where auth bites.
    }

    /**
     * Deliberately only deck_id and wheels_id. There is no trucks/bolts
     * picker on the page — CustomizeController resolves the single active
     * row for each server-side, the same way it does for the page itself.
     * Accepting a trucks_id/bolts_id from the client would let a request
     * name a component the customizer never showed the shopper.
     */
    public function rules(): array
    {
        return [
            'deck_id' => ['required', 'integer', 'min:1'],
            'wheels_id' => ['required', 'integer', 'min:1'],
        ];
    }
}
