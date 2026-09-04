import StockBadge from '@/Components/Admin/StockBadge';
import IconButton from '@/Components/Admin/IconButton';
import { PencilIcon, TrashIcon, CheckIcon, XIcon } from '@/Components/Admin/icons';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

const inputClasses = 'rounded border-white/15 bg-ink-900 text-white text-sm focus:border-volt-500 focus:ring-volt-500 admin-light:border-ink-900/15 admin-light:bg-white admin-light:text-ink-900';

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
            <tr className="hover:bg-white/[0.03] admin-light:hover:bg-ink-900/[0.03]">
                <td className="px-4 py-3 text-sm text-white admin-light:text-ink-900">{[variant.size, variant.color].filter(Boolean).join(' / ') || '—'}</td>
                <td className="px-4 py-3 text-sm font-mono text-white/50 admin-light:text-ink-900/60">{variant.sku}</td>
                <td className="px-4 py-3 text-sm text-white/50 admin-light:text-ink-900/60">{variant.effective_price_formatted}</td>
                <td className="px-4 py-3">
                    <StockBadge
                        stock={variant.stock}
                        isLowStock={variant.is_low_stock}
                        isOutOfStock={variant.is_out_of_stock}
                        threshold={variant.low_stock_threshold}
                    />
                </td>
                <td className="px-4 py-3 text-sm text-white/50 admin-light:text-ink-900/60">{variant.low_stock_threshold}</td>
                <td className="px-4 py-3">
                    <span className={variant.is_active ? 'text-green-400 text-xs' : 'text-white/25 text-xs admin-light:text-ink-900/35'}>
                        {variant.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td className="px-4 py-3 text-right">
                    <IconButton onClick={() => setEditing(true)} label={`Edit ${variant.sku}`}>
                        <PencilIcon />
                    </IconButton>
                    <IconButton onClick={destroy} label={`Delete ${variant.sku}`} tone="danger">
                        <TrashIcon />
                    </IconButton>
                </td>
            </tr>
        );
    }

    return (
        <tr className="bg-volt-500/10">
            <td className="px-4 py-2">
                <div className="flex gap-1">
                    <input
                        className={`w-16 ${inputClasses}`}
                        placeholder="Size"
                        value={data.size}
                        onChange={(e) => setData('size', e.target.value)}
                    />
                    <input
                        className={`w-20 ${inputClasses}`}
                        placeholder="Color"
                        value={data.color}
                        onChange={(e) => setData('color', e.target.value)}
                    />
                </div>
                {errors.size && <p className="text-xs text-red-400 mt-1">{errors.size}</p>}
            </td>
            <td className="px-4 py-2">
                <input
                    className={`w-28 font-mono ${inputClasses}`}
                    value={data.sku}
                    onChange={(e) => setData('sku', e.target.value)}
                />
                {errors.sku && <p className="text-xs text-red-400 mt-1">{errors.sku}</p>}
            </td>
            <td className="px-4 py-2">
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="inherit"
                    className={`w-20 ${inputClasses}`}
                    value={data.price}
                    onChange={(e) => setData('price', e.target.value)}
                />
                {errors.price && <p className="text-xs text-red-400 mt-1">{errors.price}</p>}
            </td>
            <td className="px-4 py-2">
                <input
                    type="number"
                    min="0"
                    className={`w-20 ${inputClasses}`}
                    value={data.stock}
                    onChange={(e) => setData('stock', e.target.value)}
                />
                {errors.stock && <p className="text-xs text-red-400 mt-1">{errors.stock}</p>}
            </td>
            <td className="px-4 py-2">
                <input
                    type="number"
                    min="0"
                    className={`w-16 ${inputClasses}`}
                    value={data.low_stock_threshold}
                    onChange={(e) => setData('low_stock_threshold', e.target.value)}
                />
            </td>
            <td className="px-4 py-2">
                <input
                    type="checkbox"
                    className="rounded border-white/15 bg-ink-900 text-volt-500 focus:ring-volt-500 admin-light:border-ink-900/15 admin-light:bg-white"
                    checked={data.is_active}
                    onChange={(e) => setData('is_active', e.target.checked)}
                />
            </td>
            <td className="px-4 py-2 text-right whitespace-nowrap">
                <IconButton onClick={save} label="Save" disabled={processing}>
                    <CheckIcon />
                </IconButton>
                <IconButton
                    onClick={() => {
                        reset();
                        setEditing(false);
                    }}
                    label="Cancel"
                >
                    <XIcon />
                </IconButton>
            </td>
        </tr>
    );
}
