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
            // GCash / bank transfer / cash. Cash is pickup-only, enforced in
            // withValidator() below rather than here — the rule depends on
            // another field, and a bare `in:` cannot express that.
            'payment_method' => ['nullable', 'string', 'in:'.implode(',', Order::PAYMENT_METHODS)],
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

    /**
     * Cash is pickup-only. A delivery order always takes the 50% deposit up
     * front, so there is nothing for cash to pay at the time of ordering —
     * the balance is the cash part. The storefront never offers the
     * combination, but nothing stops a forged POST.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $isDelivery = $this->input('fulfillment_method') === Order::FULFILLMENT_DELIVERY;

            if ($isDelivery && $this->input('payment_method') === Order::PAYMENT_METHOD_CASH) {
                $validator->errors()->add(
                    'payment_method',
                    'Delivery orders need a 50% deposit by GCash or bank transfer. Cash is pickup only.'
                );
            }
        });
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
