import AdminLayout from '@/Layouts/AdminLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Card from '@/Components/Admin/Card';
import PrimaryButton from '@/Components/Admin/PrimaryButton';
import StockBadge from '@/Components/Admin/StockBadge';
import { ArrowLeftIcon, PhotoIcon } from '@/Components/Admin/icons';
import { Head, Link, useForm } from '@inertiajs/react';

const sectionTitle = 'text-sm font-semibold text-white admin-light:text-ink-900';

export default function Edit({ component }) {
    const { data, setData, patch, processing, errors } = useForm({
        name: component.name,
        price: component.price,
        stock: component.stock,
        low_stock_threshold: component.low_stock_threshold,
        is_active: component.is_active,
    });

    function submit(e) {
        e.preventDefault();
        patch(route('admin.skateboard-components.update', component.id));
    }

    // The badge follows what's typed, so staff see "low" / "out" before saving.
    const stockNow = Number(data.stock) || 0;
    const thresholdNow = Number(data.low_stock_threshold) || 0;

    const restock = (amount) => setData('stock', stockNow + amount);

    return (
        <AdminLayout header={`Edit — ${component.name}`}>
            <Head title={`Admin · Edit ${component.name}`} />

            <Link
                href={route('admin.skateboard-components.index')}
                className="inline-flex items-center gap-1.5 text-sm text-volt-500 hover:text-volt-400 admin-light:text-volt-800"
            >
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                All parts
            </Link>

            <form onSubmit={submit} className="mt-4 grid gap-6 lg:grid-cols-3">
                <Card className="space-y-5 p-6 lg:col-span-2">
                    <div>
                        <h2 className={sectionTitle}>Details</h2>
                        <p className="text-xs text-white/40 admin-light:text-ink-900/50">Shown on /parts and in the 3D board builder.</p>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="name" value="Name" />
                            <TextInput id="name" className="mt-1 block w-full" value={data.name} onChange={(e) => setData('name', e.target.value)} />
                            <InputError message={errors.name} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="price" value="Price (₱)" />
                            <TextInput
                                id="price"
                                type="number"
                                step="0.01"
                                min="0"
                                className="mt-1 block w-full"
                                value={data.price}
                                onChange={(e) => setData('price', e.target.value)}
                            />
                            <InputError message={errors.price} className="mt-1" />
                        </div>
                    </div>

                    <div className="rounded-md border border-white/10 p-4 admin-light:border-ink-900/10">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h3 className={sectionTitle}>Stock</h3>
                            <StockBadge
                                stock={stockNow}
                                isOutOfStock={stockNow <= 0}
                                isLowStock={stockNow <= thresholdNow}
                                threshold={thresholdNow}
                            />
                        </div>

                        <div className="mt-4 grid gap-5 sm:grid-cols-2">
                            <div>
                                <InputLabel htmlFor="stock" value="Units on hand" />
                                <TextInput
                                    id="stock"
                                    type="number"
                                    min="0"
                                    className="mt-1 block w-full"
                                    value={data.stock}
                                    onChange={(e) => setData('stock', e.target.value)}
                                />
                                <div className="mt-2 flex gap-2">
                                    {[5, 10, 20].map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => restock(n)}
                                            className="rounded-md border border-white/15 px-2.5 py-1 text-xs font-semibold text-white/60 transition hover:border-volt-500 hover:text-white admin-light:border-ink-900/15 admin-light:text-ink-900/60 admin-light:hover:text-ink-900"
                                        >
                                            +{n}
                                        </button>
                                    ))}
                                </div>
                                <InputError message={errors.stock} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="low_stock_threshold" value="Warn me at" />
                                <TextInput
                                    id="low_stock_threshold"
                                    type="number"
                                    min="0"
                                    className="mt-1 block w-full"
                                    value={data.low_stock_threshold}
                                    onChange={(e) => setData('low_stock_threshold', e.target.value)}
                                />
                                <p className="mt-2 text-xs text-white/35 admin-light:text-ink-900/45">
                                    The dashboard flags it once stock drops to this.
                                </p>
                                <InputError message={errors.low_stock_threshold} className="mt-1" />
                            </div>
                        </div>
                    </div>

                    <label
                        htmlFor="is_active"
                        className="flex cursor-pointer items-center justify-between gap-4 rounded-md border border-white/10 px-4 py-3 admin-light:border-ink-900/10"
                    >
                        <span>
                            <span className="block text-sm font-medium text-white admin-light:text-ink-900">Available to buy</span>
                            <span className="block text-xs text-white/40 admin-light:text-ink-900/50">Untick to hide it from /parts and the builder.</span>
                        </span>
                        <input
                            id="is_active"
                            type="checkbox"
                            className="h-5 w-5 rounded border-white/15 bg-ink-900 text-volt-500 shadow-sm focus:ring-volt-500 admin-light:border-ink-900/15 admin-light:bg-white"
                            checked={data.is_active}
                            onChange={(e) => setData('is_active', e.target.checked)}
                        />
                    </label>

                    <div className="flex items-center gap-4 border-t border-white/10 pt-5 admin-light:border-ink-900/10">
                        <PrimaryButton type="submit" disabled={processing}>
                            {processing ? 'Saving…' : 'Save changes'}
                        </PrimaryButton>
                        <Link
                            href={route('admin.skateboard-components.index')}
                            className="text-sm text-white/40 hover:text-white/70 admin-light:text-ink-900/50 admin-light:hover:text-ink-900/80"
                        >
                            Cancel
                        </Link>
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card className="p-6">
                        <h2 className={sectionTitle}>Preview</h2>
                        <div className="mt-3 flex aspect-square items-center justify-center rounded-md border border-white/10 bg-[radial-gradient(circle_at_center,rgba(204,255,0,0.1),transparent_70%)] p-6 admin-light:border-ink-900/10">
                            {component.image_url ? (
                                <img src={component.image_url} alt="" className="max-h-full max-w-full object-contain" />
                            ) : (
                                <PhotoIcon className="h-10 w-10 text-white/20 admin-light:text-ink-900/25" />
                            )}
                        </div>
                        <p className="mt-2 text-xs text-white/35 admin-light:text-ink-900/45">Rendered from the 3D model.</p>
                    </Card>

                    {/* Read-only: these name a real mesh inside the 3D model
                        files. Editing them isn't offered at all — a typo would
                        silently break the customizer. */}
                    <Card className="p-6">
                        <h2 className={sectionTitle}>3D model</h2>
                        <dl className="mt-3 space-y-2 text-sm">
                            {[
                                ['Type', component.type_label],
                                ['Model file', component.glb_file],
                                ['Mesh', component.mesh_name],
                            ].map(([label, value]) => (
                                <div key={label} className="flex justify-between gap-4">
                                    <dt className="text-white/40 admin-light:text-ink-900/50">{label}</dt>
                                    <dd className="font-mono text-white/70 admin-light:text-ink-900/75">{value}</dd>
                                </div>
                            ))}
                        </dl>
                        <p className="mt-3 text-xs text-white/30 admin-light:text-ink-900/40">Locked — tied to the 3D model files.</p>
                    </Card>
                </div>
            </form>
        </AdminLayout>
    );
}
