<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSkateboardComponentRequest;
use App\Models\SkateboardComponent;
use App\Support\Money;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Edit-only, by design — see CLAUDE.md's Phase 6a notes. There is no
 * create/store/destroy: every row here is tied to a real mesh baked into
 * public/models/{board,wheels}.glb, and a component with no matching mesh
 * would be "purchasable" but invisible in the 3D customizer. New physical
 * components need a new mesh added to those files first, which is outside
 * this admin panel's scope.
 */
class SkateboardComponentController extends Controller
{
    public function index(): Response
    {
        $components = SkateboardComponent::query()
            ->latest()
            ->get()
            ->map(fn (SkateboardComponent $c) => [
                'id' => $c->id,
                'type' => $c->type,
                'type_label' => SkateboardComponent::TYPE_LABELS[$c->type] ?? $c->type,
                'name' => $c->name,
                'price_formatted' => Money::format($c->price_centavos),
                'stock' => $c->stock,
                'low_stock_threshold' => $c->low_stock_threshold,
                'is_low_stock' => $c->isLowStock(),
                'is_out_of_stock' => $c->isOutOfStock(),
                'is_active' => $c->is_active,
            ]);

        return Inertia::render('Admin/SkateboardComponents/Index', [
            'components' => $components,
            'typeLabels' => SkateboardComponent::TYPE_LABELS,
        ]);
    }

    public function edit(SkateboardComponent $skateboardComponent): Response
    {
        return Inertia::render('Admin/SkateboardComponents/Edit', [
            'component' => [
                'id' => $skateboardComponent->id,
                'name' => $skateboardComponent->name,
                'type_label' => SkateboardComponent::TYPE_LABELS[$skateboardComponent->type] ?? $skateboardComponent->type,
                'glb_file' => $skateboardComponent->glb_file,
                'mesh_name' => $skateboardComponent->mesh_name,
                'price' => Money::toPesos($skateboardComponent->price_centavos),
                'stock' => $skateboardComponent->stock,
                'low_stock_threshold' => $skateboardComponent->low_stock_threshold,
                'is_active' => $skateboardComponent->is_active,
            ],
        ]);
    }

    /**
     * NOT InventoryService — same reasoning as Admin\ProductVariantController:
     * this is a direct admin correction, not the order-driven concurrent
     * decrement path. No DB::transaction()/row lock needed here.
     */
    public function update(UpdateSkateboardComponentRequest $request, SkateboardComponent $skateboardComponent): RedirectResponse
    {
        $data = $request->validated();

        $skateboardComponent->update([
            'name' => $data['name'],
            'price_centavos' => Money::toCentavos($data['price']),
            'stock' => $data['stock'],
            'low_stock_threshold' => $data['low_stock_threshold'],
            'is_active' => $request->boolean('is_active', true),
        ]);

        return back()->with('success', 'Component updated.');
    }
}
