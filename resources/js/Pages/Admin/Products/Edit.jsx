import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Card from '@/Components/Admin/Card';
import PrimaryButton from '@/Components/Admin/PrimaryButton';
import { ArrowLeftIcon, ArchiveBoxIcon, PhotoIcon } from '@/Components/Admin/icons';
import VariantsSection from './Partials/VariantsSection';
import { useConfirm } from '@/Components/Admin/ConfirmDialog';
import { Head, Link, router, useForm } from '@inertiajs/react';

const fieldClasses =
    'mt-1 block w-full rounded-md border-white/15 bg-ink-900 text-white shadow-sm focus:border-volt-500 focus:ring-volt-500 admin-light:border-ink-900/15 admin-light:bg-white admin-light:text-ink-900';

const sectionTitle = 'text-sm font-semibold text-white admin-light:text-ink-900';

export default function Edit({ product, categories, types, typeLabels, variants }) {
    const [confirmDialog, ask] = useConfirm();
    const { data, setData, patch, processing, errors } = useForm({
        name: product.name,
        description: product.description ?? '',
        category: product.category,
        type: product.type ?? (types[0] ?? ''),
        base_price: product.base_price,
        is_active: product.is_active,
        image: null,
    });
    const [preview, setPreview] = useState(null);

    const isApparel = data.category === 'apparel';

    function onImageChange(e) {
        const file = e.target.files[0] ?? null;
        setData('image', file);
        setPreview(file ? URL.createObjectURL(file) : null);
    }

    function submit(e) {
        e.preventDefault();
        patch(route('admin.products.update', product.id));
    }

    function archive() {
        ask(
            {
                title: `Archive "${product.name}"?`,
                message: 'It will no longer appear in the catalogue. Order history is preserved.',
                confirmLabel: 'Archive',
                danger: true,
            },
            () => router.delete(route('admin.products.destroy', product.id))
        );
    }

    // Figures for the Stock card — same rules as the list page and the
    // dashboard (TracksStock).
    const stock = {
        units: variants.reduce((sum, v) => sum + v.stock, 0),
        low: variants.filter((v) => v.is_low_stock && !v.is_out_of_stock).length,
        out: variants.filter((v) => v.is_out_of_stock).length,
    };

    return (
        <AdminLayout header={`Edit — ${product.name}`}>
            <Head title={`Admin · Edit ${product.name}`} />
            {confirmDialog}

            <Link
                href={route('admin.products.index')}
                className="inline-flex items-center gap-1.5 text-sm text-volt-500 hover:text-volt-400 admin-light:text-volt-800"
            >
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                All products
            </Link>

            <form onSubmit={submit} className="mt-4 grid gap-6 lg:grid-cols-3">
                {/* Details */}
                <Card className="space-y-5 p-6 lg:col-span-2">
                    <div>
                        <h2 className={sectionTitle}>Details</h2>
                        <p className="text-xs text-white/40 admin-light:text-ink-900/50">What customers see on the shop page.</p>
                    </div>

                    <div>
                        <InputLabel htmlFor="name" value="Name" />
                        <TextInput id="name" className="mt-1 block w-full" value={data.name} onChange={(e) => setData('name', e.target.value)} />
                        <InputError message={errors.name} className="mt-1" />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-3">
                        <div>
                            <InputLabel htmlFor="category" value="Category" />
                            <select
                                id="category"
                                className={`${fieldClasses} capitalize`}
                                value={data.category}
                                onChange={(e) => setData('category', e.target.value)}
                            >
                                {categories.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.category} className="mt-1" />
                        </div>

                        {isApparel && (
                            <div>
                                <InputLabel htmlFor="type" value="Shop section" />
                                <select id="type" className={fieldClasses} value={data.type} onChange={(e) => setData('type', e.target.value)}>
                                    {types.map((t) => (
                                        <option key={t} value={t}>
                                            {typeLabels[t] ?? t}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.type} className="mt-1" />
                            </div>
                        )}

                        <div>
                            <InputLabel htmlFor="base_price" value="Base price (₱)" />
                            <TextInput
                                id="base_price"
                                type="number"
                                step="0.01"
                                min="0"
                                className="mt-1 block w-full"
                                value={data.base_price}
                                onChange={(e) => setData('base_price', e.target.value)}
                            />
                            <InputError message={errors.base_price} className="mt-1" />
                        </div>
                    </div>

                    <div>
                        <InputLabel htmlFor="description" value="Description" />
                        <textarea
                            id="description"
                            rows={4}
                            className={fieldClasses}
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                        />
                        <InputError message={errors.description} className="mt-1" />
                    </div>

                    <label
                        htmlFor="is_active"
                        className="flex cursor-pointer items-center justify-between gap-4 rounded-md border border-white/10 px-4 py-3 admin-light:border-ink-900/10"
                    >
                        <span>
                            <span className="block text-sm font-medium text-white admin-light:text-ink-900">Visible in the shop</span>
                            <span className="block text-xs text-white/40 admin-light:text-ink-900/50">Untick to hide it without archiving.</span>
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
                            href={route('admin.products.index')}
                            className="text-sm text-white/40 hover:text-white/70 admin-light:text-ink-900/50 admin-light:hover:text-ink-900/80"
                        >
                            Cancel
                        </Link>
                    </div>
                </Card>

                <div className="space-y-6">
                    {/* Photo — part of the same form, saved with Save changes. */}
                    <Card className="p-6">
                        <h2 className={sectionTitle}>Photo</h2>
                        <div className="mt-3 overflow-hidden rounded-md border border-white/10 admin-light:border-ink-900/10">
                            {preview || product.image_path ? (
                                <img src={preview ?? product.image_path} alt="" className="aspect-square w-full object-cover" />
                            ) : (
                                <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-white/[0.04] text-white/25 admin-light:bg-ink-900/[0.04] admin-light:text-ink-900/30">
                                    <PhotoIcon className="h-10 w-10" />
                                    <span className="text-xs">No photo yet</span>
                                </div>
                            )}
                        </div>
                        <label
                            htmlFor="image"
                            className="font-oswald mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/70 transition hover:border-volt-500 hover:text-white admin-light:border-ink-900/15 admin-light:text-ink-900/70 admin-light:hover:text-ink-900"
                        >
                            <PhotoIcon className="h-4 w-4" />
                            {product.image_path || preview ? 'Replace photo' : 'Upload photo'}
                        </label>
                        <input id="image" type="file" accept="image/png,image/jpeg,image/webp" onChange={onImageChange} className="sr-only" />
                        <p className="mt-2 text-xs text-white/35 admin-light:text-ink-900/45">
                            {preview ? 'New photo selected. Save changes to keep it.' : 'JPG, PNG or WEBP, up to 4MB.'}
                        </p>
                        <InputError message={errors.image} className="mt-1" />
                    </Card>

                    {/* Stock overview */}
                    <Card className="p-6">
                        <h2 className={sectionTitle}>Stock</h2>
                        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-md bg-white/[0.04] p-3 admin-light:bg-ink-900/[0.04]">
                                <dt className="text-[11px] uppercase tracking-wider text-white/40 admin-light:text-ink-900/50">Units</dt>
                                <dd className="font-oswald mt-1 text-xl font-bold text-white admin-light:text-ink-900">{stock.units}</dd>
                            </div>
                            <div className="rounded-md bg-amber-500/10 p-3">
                                <dt className="text-[11px] uppercase tracking-wider text-amber-500">Low</dt>
                                <dd className="font-oswald mt-1 text-xl font-bold text-amber-500">{stock.low}</dd>
                            </div>
                            <div className="rounded-md bg-red-500/10 p-3">
                                <dt className="text-[11px] uppercase tracking-wider text-red-500">Out</dt>
                                <dd className="font-oswald mt-1 text-xl font-bold text-red-500">{stock.out}</dd>
                            </div>
                        </dl>
                        <p className="mt-3 text-xs text-white/35 admin-light:text-ink-900/45">
                            {variants.length} size/colour {variants.length === 1 ? 'option' : 'options'}, edited below.
                        </p>
                    </Card>

                    {/* Archive */}
                    <Card className="p-6">
                        <h2 className="text-sm font-semibold text-red-400">Archive</h2>
                        <p className="mt-1 text-xs text-white/40 admin-light:text-ink-900/50">
                            Removes it from the shop. Past orders keep their record of it.
                        </p>
                        <button
                            type="button"
                            onClick={archive}
                            className="font-oswald mt-3 inline-flex items-center gap-2 rounded-md border border-red-500/40 px-4 py-2 text-xs font-bold uppercase tracking-widest text-red-400 transition hover:bg-red-500/10"
                        >
                            <ArchiveBoxIcon className="h-4 w-4" />
                            Archive product
                        </button>
                    </Card>
                </div>
            </form>

            <VariantsSection productId={product.id} variants={variants} />
        </AdminLayout>
    );
}
