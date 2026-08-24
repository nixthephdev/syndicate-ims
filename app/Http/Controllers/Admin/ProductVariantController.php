<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreProductVariantRequest;
use App\Http\Requests\Admin\UpdateProductVariantRequest;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Support\Money;
use Illuminate\Http\RedirectResponse;

class ProductVariantController extends Controller
{
    /**
     * NOT InventoryService. This is a direct stock write, and that's correct
     * here: InventoryService exists specifically for order-driven decrements
     * under a row lock, where two shoppers can race for the same stock. A
     * staff member entering "we received 50 units" is not part of that race —
     * see CLAUDE.md's Data layer section for the distinction.
     */
    public function store(StoreProductVariantRequest $request, Product $product): RedirectResponse
    {
        $data = $request->validated();

        $product->variants()->create([
            'size' => $data['size'] ?? null,
            'color' => $data['color'] ?? null,
            'sku' => $data['sku'],
            'price_centavos' => isset($data['price']) ? Money::toCentavos($data['price']) : null,
            'stock' => $data['stock'],
            'low_stock_threshold' => $data['low_stock_threshold'],
            'is_active' => $request->boolean('is_active', true),
        ]);

        return back()->with('success', 'Variant added.');
    }

    public function update(UpdateProductVariantRequest $request, Product $product, ProductVariant $variant): RedirectResponse
    {
        $data = $request->validated();

        $variant->update([
            'size' => $data['size'] ?? null,
            'color' => $data['color'] ?? null,
            'sku' => $data['sku'],
            'price_centavos' => isset($data['price']) ? Money::toCentavos($data['price']) : null,
            'stock' => $data['stock'],
            'low_stock_threshold' => $data['low_stock_threshold'],
            'is_active' => $request->boolean('is_active', true),
        ]);

        return back()->with('success', 'Variant updated.');
    }

    /**
     * Blocked when the variant has order history. ProductVariant has no
     * SoftDeletes, so this is the only guard against orphaning a purchase
     * record's relation (order_items keeps its own name/price snapshot
     * regardless, but there's no reason to allow the loss).
     */
    public function destroy(Product $product, ProductVariant $variant): RedirectResponse
    {
        if ($variant->orderItems()->exists()) {
            return back()->withErrors([
                'variant' => 'This variant has order history and cannot be deleted. Deactivate it instead.',
            ]);
        }

        $variant->delete();

        return back()->with('success', 'Variant removed.');
    }
}
