import StockBadge from '@/Components/Admin/StockBadge';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

/**
 * One variant, one independent form. Each row submits its own PATCH so
 * editing one variant's stock never touches another's in-flight edit.
 */
export default function VariantRow({ productId, variant }) {
    const [editing, setEditing] = useState(false);

    const { data, setData, patch, processing, errors, reset } = useForm({
        size: variant.size ?? '',
        color: variant.color ?? '',
        sku: variant.sku,
        price: variant.price ?? '',
        stock: variant.stock,
        low_stock_threshold: variant.low_stock_threshold,
        is_active: variant.is_active,
    });

    function save(e) {
        e.preventDefault();
        patch(route('admin.products.variants.update', [productId, variant.id]), {
            preserveScroll: true,
            onSuccess: () => setEditing(false),
        });
    }

    function destroy() {
        if (!confirm(`Delete variant "${variant.sku}"? This cannot be undone.`)) {
            return;
        }
        router.delete(route('admin.products.variants.destroy', [productId, variant.id]), {
            preserveScroll: true,
        });
    }

    if (!editing) {
        return (
            <tr>
                <td className="px-4 py-3 text-sm text-gray-900">{[variant.size, variant.color].filter(Boolean).join(' / ') || '—'}</td>
                <td className="px-4 py-3 text-sm font-mono text-gray-500">{variant.sku}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{variant.effective_price_formatted}</td>
                <td className="px-4 py-3">
                    <StockBadge
                        stock={variant.stock}
                        isLowStock={variant.is_low_stock}
                        isOutOfStock={variant.is_out_of_stock}
                        threshold={variant.low_stock_threshold}
                    />
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{variant.low_stock_threshold}</td>
                <td className="px-4 py-3">
                    <span className={variant.is_active ? 'text-green-700 text-xs' : 'text-gray-400 text-xs'}>
                        {variant.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td className="px-4 py-3 text-right space-x-3 text-sm">
                    <button onClick={() => setEditing(true)} className="text-brand-600 hover:text-brand-700">
                        Edit
                    </button>
                    <button onClick={destroy} className="text-red-600 hover:text-red-700">
                        Delete
                    </button>
                </td>
            </tr>
        );
    }

    return (
        <tr className="bg-brand-50/40">
            <td className="px-4 py-2">
                <div className="flex gap-1">
                    <input
                        className="w-16 rounded border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
                        placeholder="Size"
                        value={data.size}
                        onChange={(e) => setData('size', e.target.value)}
                    />
                    <input
                        className="w-20 rounded border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
                        placeholder="Color"
                        value={data.color}
                        onChange={(e) => setData('color', e.target.value)}
                    />
                </div>
                {errors.size && <p className="text-xs text-red-600 mt-1">{errors.size}</p>}
            </td>
            <td className="px-4 py-2">
                <input
                    className="w-28 rounded border-gray-300 text-sm font-mono focus:border-brand-500 focus:ring-brand-500"
                    value={data.sku}
                    onChange={(e) => setData('sku', e.target.value)}
                />
                {errors.sku && <p className="text-xs text-red-600 mt-1">{errors.sku}</p>}
            </td>
            <td className="px-4 py-2">
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="inherit"
                    className="w-20 rounded border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
                    value={data.price}
                    onChange={(e) => setData('price', e.target.value)}
                />
                {errors.price && <p className="text-xs text-red-600 mt-1">{errors.price}</p>}
            </td>
            <td className="px-4 py-2">
                <input
                    type="number"
                    min="0"
                    className="w-20 rounded border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
                    value={data.stock}
                    onChange={(e) => setData('stock', e.target.value)}
                />
                {errors.stock && <p className="text-xs text-red-600 mt-1">{errors.stock}</p>}
            </td>
            <td className="px-4 py-2">
                <input
                    type="number"
                    min="0"
                    className="w-16 rounded border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
                    value={data.low_stock_threshold}
                    onChange={(e) => setData('low_stock_threshold', e.target.value)}
                />
            </td>
            <td className="px-4 py-2">
                <input
                    type="checkbox"
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    checked={data.is_active}
                    onChange={(e) => setData('is_active', e.target.checked)}
                />
            </td>
            <td className="px-4 py-2 text-right space-x-3 text-sm whitespace-nowrap">
                <button onClick={save} disabled={processing} className="text-brand-600 hover:text-brand-700 disabled:opacity-50">
                    Save
                </button>
                <button
                    onClick={() => {
                        reset();
                        setEditing(false);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                >
                    Cancel
                </button>
            </td>
        </tr>
    );
}
