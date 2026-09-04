import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/Admin/PrimaryButton';
import { useForm } from '@inertiajs/react';

const inputClasses = 'rounded border-white/15 bg-ink-900 text-white text-sm focus:border-volt-500 focus:ring-volt-500 admin-light:border-ink-900/15 admin-light:bg-white admin-light:text-ink-900';

export default function AddVariantForm({ productId }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        size: '',
        color: '',
        sku: '',
        price: '',
        stock: 0,
        low_stock_threshold: 5,
        is_active: true,
    });

    function submit(e) {
        e.preventDefault();
        post(route('admin.products.variants.store', productId), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    }

    return (
        <form onSubmit={submit} className="px-4 py-4 bg-white/[0.03] border-t border-white/10 admin-light:bg-ink-900/[0.03] admin-light:border-ink-900/10">
            <div className="flex flex-wrap items-end gap-3">
                <div>
                    <label className="block text-xs text-white/40 mb-1 admin-light:text-ink-900/50">Size</label>
                    <input
                        className={`w-16 ${inputClasses}`}
                        value={data.size}
                        onChange={(e) => setData('size', e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs text-white/40 mb-1 admin-light:text-ink-900/50">Color</label>
                    <input
                        className={`w-24 ${inputClasses}`}
                        value={data.color}
                        onChange={(e) => setData('color', e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs text-white/40 mb-1 admin-light:text-ink-900/50">SKU *</label>
                    <input
                        className={`w-32 font-mono ${inputClasses}`}
                        value={data.sku}
                        onChange={(e) => setData('sku', e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs text-white/40 mb-1 admin-light:text-ink-900/50">Price override (₱)</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="inherit"
                        className={`w-24 ${inputClasses}`}
                        value={data.price}
                        onChange={(e) => setData('price', e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs text-white/40 mb-1 admin-light:text-ink-900/50">Stock *</label>
                    <input
                        type="number"
                        min="0"
                        className={`w-20 ${inputClasses}`}
                        value={data.stock}
                        onChange={(e) => setData('stock', e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs text-white/40 mb-1 admin-light:text-ink-900/50">Low-stock at</label>
                    <input
                        type="number"
                        min="0"
                        className={`w-20 ${inputClasses}`}
                        value={data.low_stock_threshold}
                        onChange={(e) => setData('low_stock_threshold', e.target.value)}
                    />
                </div>
                <PrimaryButton type="submit" disabled={processing}>
                    Add Variant
                </PrimaryButton>
            </div>

            <div className="flex flex-wrap gap-4 mt-2">
                <InputError message={errors.sku} />
                <InputError message={errors.size} />
                <InputError message={errors.stock} />
                <InputError message={errors.price} />
            </div>
        </form>
    );
}
