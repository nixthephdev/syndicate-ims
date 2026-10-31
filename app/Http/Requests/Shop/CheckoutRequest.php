<?php

namespace App\Http\Requests\Shop;

use App\Models\Order;
use App\Support\PhAddress;
use Illuminate\Foundation\Http\FormRequest;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_email' => ['required', 'email', 'max:255'],
            // PH mobile numbers. Kept permissive on separators because people
            // type +63 917 123 4567, 0917-123-4567 and 09171234567 equally.
            'customer_phone' => ['required', 'string', 'max:32', 'regex:/^[0-9+()\-\s]{7,32}$/'],
            // All three optional and default server-side (see
            // CheckoutController::otpStore()) to pickup / gcash / full — this
            // keeps every caller that predates them working unchanged.
            'fulfillment_method' => ['nullable', 'string', 'in:'.implode(',', Order::FULFILLMENT_METHODS)],
            // GCash only. Cash on pickup was removed (client, 2026-10-31), so
            // a POST still sending 'cash' is refused rather than accepted.
            'payment_method' => ['nullable', 'string', 'in:'.implode(',', Order::PAYMENT_METHODS)],
            // Pay everything now, or 50% now and the rest on handover.
            'payment_option' => ['nullable', 'string', 'in:'.implode(',', Order::PAYMENT_OPTIONS)],
            // Required once delivery is chosen — a delivery order with
            // nowhere to deliver to isn't a real order. Pickup orders have
            // nothing to fill in here, same as before. Province, city and
            // barangay come from dropdowns; withValidator() checks they are
            // a real combination.
            'address_line' => ['nullable', 'string', 'max:255', 'required_if:fulfillment_method,'.Order::FULFILLMENT_DELIVERY],
            'barangay' => ['nullable', 'string', 'max:255', 'required_if:fulfillment_method,'.Order::FULFILLMENT_DELIVERY],
            'city' => ['nullable', 'string', 'max:255', 'required_if:fulfillment_method,'.Order::FULFILLMENT_DELIVERY],
            'province' => ['nullable', 'string', 'max:255', 'required_if:fulfillment_method,'.Order::FULFILLMENT_DELIVERY],
            'postal_code' => ['nullable', 'digits:4'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * The dropdowns only offer real province/city/barangay combinations, but
     * nothing stops a forged POST — and the whole point of the dropdowns is
     * that a typo'd barangay never reaches the shop.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $given = $this->filled('province') || $this->filled('city') || $this->filled('barangay');

            if (! $given || $validator->errors()->hasAny(['province', 'city', 'barangay'])) {
                return;
            }

            if (! PhAddress::isValid($this->input('province'), $this->input('city'), $this->input('barangay'))) {
                $validator->errors()->add('barangay', PhAddress::INVALID_MESSAGE);
            } elseif (PhAddress::settleZip($this->all()) === null) {
                $validator->errors()->add('postal_code', PhAddress::ZIP_MESSAGE);
            }
        });
    }

    /**
     * The ZIP comes from the address list, not the keyboard: a town with one
     * ZIP gets it filled in here, whatever was typed. Done after validation
     * passes, then folded into validated() — which is what the controller
     * stashes — so the stored order carries the right code.
     */
    public function validated($key = null, $default = null)
    {
        $data = parent::validated();

        if (! empty($data['city'])) {
            $data = PhAddress::settleZip($data) ?? $data;
        }

        return data_get($data, $key, $default);
    }

    public function messages(): array
    {
        return [
            'customer_phone.regex' => 'Enter a contact number the shop can reach you on.',
            'payment_method.in' => 'Payment is by GCash.',
            'address_line.required_if' => 'Enter a delivery address, or switch to pickup.',
            'barangay.required_if' => 'Pick a barangay, or switch to pickup.',
            'city.required_if' => 'Pick a city/municipality, or switch to pickup.',
            'province.required_if' => 'Pick a province, or switch to pickup.',
            'postal_code.digits' => 'A ZIP code is 4 digits.',
        ];
    }
}
