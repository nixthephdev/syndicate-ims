<?php

namespace App\Http\Requests\Admin;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Already gated by the 'role:staff' route middleware — see
        // routes/web.php. Not duplicated here.
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category' => ['required', Rule::in(Product::CATEGORIES)],
            // Only meaningful for apparel — required there, forbidden for
            // skateboard so a "complete board" product can't be filed under
            // "tee" by mistake.
            'type' => [
                Rule::requiredIf($this->input('category') === Product::CATEGORY_APPAREL),
                Rule::excludeIf($this->input('category') !== Product::CATEGORY_APPAREL),
                Rule::in(Product::TYPES),
            ],
            // Pesos, as typed by a human. Converted to centavos in the controller.
            'base_price' => ['required', 'numeric', 'min:0'],
            'is_active' => ['boolean'],
        ];
    }
}
