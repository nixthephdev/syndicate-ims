<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Deliberately narrow — this is the edit-only admin CRUD for
 * SkateboardComponent (no create). type/glb_file/mesh_name are never
 * validated here because they are never in the update payload the Edit
 * page sends: they're read-only fields tied to the actual mesh names
 * inside public/models/{board,wheels}.glb, and a typo in either would
 * silently break the 3D customizer's mesh lookup.
 */
class UpdateSkateboardComponentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Gated by 'role:staff' route middleware.
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
            'low_stock_threshold' => ['required', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ];
    }
}
