<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreProductRequest;
use App\Http\Requests\Admin\UpdateProductRequest;
use App\Models\Product;
use App\Support\Money;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(): Response
    {
        $products = Product::query()
            ->withCount('variants')
            ->withSum('variants', 'stock')
            ->latest()
            ->get()
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'name' => $product->name,
                'category' => $product->category,
                'type' => $product->type,
                'base_price_centavos' => $product->base_price_centavos,
                'base_price_formatted' => Money::format($product->base_price_centavos),
                'is_active' => $product->is_active,
                'variants_count' => $product->variants_count,
                'total_stock' => (int) ($product->variants_sum_stock ?? 0),
            ]);

        return Inertia::render('Admin/Products/Index', [
            'products' => $products,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Products/Create', [
            'categories' => Product::CATEGORIES,
            'types' => Product::TYPES,
            'typeLabels' => Product::TYPE_LABELS,
        ]);
    }

    public function store(StoreProductRequest $request): RedirectResponse
    {
        $data = $request->validated();

        Product::create([
            'name' => $data['name'],
            'slug' => $this->uniqueSlug($data['name']),
            'description' => $data['description'] ?? null,
            'category' => $data['category'],
            'type' => $data['type'] ?? null,
            'base_price_centavos' => Money::toCentavos($data['base_price']),
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('admin.products.index')
            ->with('success', 'Product created. Add variants to give it stock.');
    }

    public function edit(Product $product): Response
    {
        $product->load('variants');

        return Inertia::render('Admin/Products/Edit', [
            'categories' => Product::CATEGORIES,
            'types' => Product::TYPES,
            'typeLabels' => Product::TYPE_LABELS,
            'product' => [
                'id' => $product->id,
                'name' => $product->name,
                'description' => $product->description,
                'category' => $product->category,
                'type' => $product->type,
                'base_price' => Money::toPesos($product->base_price_centavos),
                'is_active' => $product->is_active,
            ],
            'variants' => $product->variants->map(fn ($v) => [
                'id' => $v->id,
                'size' => $v->size,
                'color' => $v->color,
                'sku' => $v->sku,
                'price' => $v->price_centavos !== null ? Money::toPesos($v->price_centavos) : null,
                'effective_price_formatted' => Money::format($v->currentPriceCentavos()),
                'stock' => $v->stock,
                'low_stock_threshold' => $v->low_stock_threshold,
                'is_active' => $v->is_active,
                'is_low_stock' => $v->isLowStock(),
                'is_out_of_stock' => $v->isOutOfStock(),
            ]),
        ]);
    }

    public function update(UpdateProductRequest $request, Product $product): RedirectResponse
    {
        $data = $request->validated();

        $product->update([
            'name' => $data['name'],
            'slug' => $this->uniqueSlug($data['name'], $product->id),
            'description' => $data['description'] ?? null,
            'category' => $data['category'],
            'type' => $data['type'] ?? null,
            'base_price_centavos' => Money::toCentavos($data['base_price']),
            'is_active' => $request->boolean('is_active', true),
        ]);

        return back()->with('success', 'Product updated.');
    }

    /**
     * Archives, not deletes — Product uses SoftDeletes so order history that
     * snapshots a variant's name stays meaningful even after the parent
     * product is retired from the catalogue.
     */
    public function destroy(Product $product): RedirectResponse
    {
        $product->delete();

        return redirect()->route('admin.products.index')
            ->with('success', 'Product archived.');
    }

    /**
     * Slug is derived from name, not user-entered — one less field to get
     * wrong. withTrashed() because the unique index doesn't care whether a
     * name collision is with an active or archived product.
     */
    private function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name) ?: 'product';
        $slug = $base;
        $i = 2;

        while (
            Product::withTrashed()
                ->where('slug', $slug)
                ->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))
                ->exists()
        ) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}
