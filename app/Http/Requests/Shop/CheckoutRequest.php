<?php

namespace App\Http\Requests\Shop;

use App\Models\Order;
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
            // Both optional and default server-side (see
            // CheckoutController::otpStore()) to pickup/gcash — this keeps
            // every caller that predates the cash/delivery split working
            // unchanged.
            'fulfillment_method' => ['nullable', 'string', 'in:'.implode(',', Order::FULFILLMENT_METHODS)],
            // gcash_deposit is never accepted from the client — delivery
            // orders are forced onto it server-side regardless of what's
            // sent here.
            'payment_method' => ['nullable', 'string', 'in:'.Order::PAYMENT_METHOD_GCASH.','.Order::PAYMENT_METHOD_CASH],
            // Required once delivery is chosen — a delivery order with
            // nowhere to deliver to isn't a real order. Pickup orders have
            // nothing to fill in here, same as before.
            'address_line' => ['nullable', 'string', 'max:255', 'required_if:fulfillment_method,'.Order::FULFILLMENT_DELIVERY],
            'barangay' => ['nullable', 'string', 'max:255', 'required_if:fulfillment_method,'.Order::FULFILLMENT_DELIVERY],
            'city' => ['nullable', 'string', 'max:255', 'required_if:fulfillment_method,'.Order::FULFILLMENT_DELIVERY],
            'province' => ['nullable', 'string', 'max:255', 'required_if:fulfillment_method,'.Order::FULFILLMENT_DELIVERY],
            'postal_code' => ['nullable', 'string', 'max:10'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'customer_phone.regex' => 'Enter a contact number the shop can reach you on.',
            'address_line.required_if' => 'Enter a delivery address, or switch to pickup.',
            'barangay.required_if' => 'Enter a barangay, or switch to pickup.',
            'city.required_if' => 'Enter a city/municipality, or switch to pickup.',
            'province.required_if' => 'Enter a province, or switch to pickup.',
        ];
    }
}
