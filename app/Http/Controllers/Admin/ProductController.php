<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreProductRequest;
use App\Http\Requests\Admin\UpdateProductRequest;
use App\Models\Product;
use App\Support\Money;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;
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
                'image_path' => $product->image_path,
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
        $slug = $this->uniqueSlug($data['name']);

        Product::create([
            'name' => $data['name'],
            'slug' => $slug,
            'description' => $data['description'] ?? null,
            'category' => $data['category'],
            'type' => $data['type'] ?? null,
            'base_price_centavos' => Money::toCentavos($data['base_price']),
            'is_active' => $request->boolean('is_active', true),
            'image_path' => $request->hasFile('image')
                ? $this->storeImage($request->file('image'), $slug)
                : null,
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
                'image_path' => $product->image_path,
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
        $slug = $this->uniqueSlug($data['name'], $product->id);

        $attributes = [
            'name' => $data['name'],
            'slug' => $slug,
            'description' => $data['description'] ?? null,
            'category' => $data['category'],
            'type' => $data['type'] ?? null,
            'base_price_centavos' => Money::toCentavos($data['base_price']),
            'is_active' => $request->boolean('is_active', true),
        ];

        // Left out entirely (no key at all) when no new file was uploaded,
        // so the existing image_path is left untouched rather than nulled
        // out — see StoreProductRequest's comment.
        if ($request->hasFile('image')) {
            $attributes['image_path'] = $this->storeImage($request->file('image'), $slug);
        }

        $product->update($attributes);

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

    /**
     * Saved straight into public/images/products/ — the same
     * physically-served-from-public convention every other product/lookbook
     * image already uses (see tools/lookbook.php), not Laravel's
     * storage/app/public symlink, so this stays consistent with how
     * image_path is read everywhere else. A random suffix on every upload
     * (not just the slug) means replacing an image on Edit never reuses a
     * stale filename a browser might have cached, and never needs the old
     * file deleted — images are sometimes shared with the Home page
     * lookbook (see DatabaseSeeder's docblock), so an old image_path could
     * still be in use elsewhere even after this product stops pointing at it.
     */
    private function storeImage(UploadedFile $file, string $slug): string
    {
        $filename = $slug.'-'.Str::random(8).'.'.$file->getClientOriginalExtension();
        $file->move(public_path('images/products'), $filename);

        return '/images/products/'.$filename;
    }
}
