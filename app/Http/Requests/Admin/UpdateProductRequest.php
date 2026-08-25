<?php

namespace App\Http\Requests\Admin;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Gated by 'role:staff' route middleware.
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category' => ['required', Rule::in(Product::CATEGORIES)],
            'type' => [
                Rule::requiredIf($this->input('category') === Product::CATEGORY_APPAREL),
                Rule::excludeIf($this->input('category') !== Product::CATEGORY_APPAREL),
                Rule::in(Product::TYPES),
            ],
            'base_price' => ['required', 'numeric', 'min:0'],
            'is_active' => ['boolean'],
        ];
    }
}
