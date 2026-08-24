<?php

namespace App\Http\Requests\Admin;

use App\Models\ProductVariant;
use Illuminate\Foundation\Http\FormRequest;

class StoreProductVariantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Gated by 'role:staff' route middleware.
    }

    public function rules(): array
    {
        $productId = $this->route('product')->id;

        return [
            'sku' => ['required', 'string', 'max:255', 'unique:product_variants,sku'],
            // Null = inherit the parent product's base price.
            'price' => ['nullable', 'numeric', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
            'low_stock_threshold' => ['required', 'integer', 'min:0'],
            'is_active' => ['boolean'],
            'size' => [
                'nullable', 'string', 'max:20',
                function ($attribute, $value, $fail) use ($productId) {
                    $duplicate = ProductVariant::where('product_id', $productId)
                        ->where('size', $value)
                        ->where('color', $this->input('color'))
                        ->exists();

                    if ($duplicate) {
                        $fail('This product already has a variant with this size/colour combination.');
                    }
                },
            ],
            'color' => ['nullable', 'string', 'max:40'],
        ];
    }
}
