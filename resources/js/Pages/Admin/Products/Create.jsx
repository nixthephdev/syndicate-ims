import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import Card from '@/Components/Admin/Card';
import PrimaryButton from '@/Components/Admin/PrimaryButton';
import { ArrowLeftIcon, PhotoIcon } from '@/Components/Admin/icons';
import { Head, Link, useForm } from '@inertiajs/react';

const fieldClasses =
    'mt-1 block w-full rounded-md border-white/15 bg-ink-900 text-white shadow-sm focus:border-volt-500 focus:ring-volt-500 admin-light:border-ink-900/15 admin-light:bg-white admin-light:text-ink-900';

const sectionTitle = 'text-sm font-semibold text-white admin-light:text-ink-900';

const peso = (value) =>
    value === '' || Number.isNaN(Number(value))
        ? '₱0.00'
        : `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Same two-column layout as Edit.jsx: the form on the left; on the right, a
 * live preview of the shop card (photo, name, price as they're typed) and
 * what to do next. A product is created with no stock — sizes/colours are
 * added on the Edit page it lands on.
 */
export default function Create({ categories, types, typeLabels }) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        category: categories[0] ?? '',
        type: types[0] ?? '',
        base_price: '',
        is_active: true,
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
        post(route('admin.products.store'));
    }

    return (
        <AdminLayout header="Add Product">
            <Head title="Admin · Add Product" />

            <Link
                href={route('admin.products.index')}
                className="inline-flex items-center gap-1.5 text-sm text-volt-500 hover:text-volt-400 admin-light:text-volt-800"
            >
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                All products
            </Link>

            <form onSubmit={submit} className="mt-4 grid gap-6 lg:grid-cols-3">
                <Card className="space-y-5 p-6 lg:col-span-2">
                    <div>
                        <h2 className={sectionTitle}>Details</h2>
                        <p className="text-xs text-white/40 admin-light:text-ink-900/50">What customers see on the shop page.</p>
                    </div>

                    <div>
                        <InputLabel htmlFor="name" value="Name" />
                        <TextInput
                            id="name"
                            className="mt-1 block w-full"
                            value={data.name}
                            isFocused
                            placeholder="e.g. Syndicate Box Logo Tee"
                            onChange={(e) => setData('name', e.target.value)}
                        />
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
                                placeholder="0.00"
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
                            rows={5}
                            className={fieldClasses}
                            placeholder="Print, fabric, fit…"
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
                            <span className="block text-xs text-white/40 admin-light:text-ink-900/50">
                                Untick to save it as a draft customers can't see yet.
                            </span>
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
                            {processing ? 'Creating…' : 'Create product'}
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
                    {/* Photo + a live preview of the shop card. */}
                    <Card className="p-6">
                        <h2 className={sectionTitle}>Photo</h2>
                        <div className="mt-3 overflow-hidden rounded-md border border-white/10 admin-light:border-ink-900/10">
                            {preview ? (
                                <img src={preview} alt="" className="aspect-square w-full object-cover" />
                            ) : (
                                <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-white/[0.04] text-white/25 admin-light:bg-ink-900/[0.04] admin-light:text-ink-900/30">
                                    <PhotoIcon className="h-10 w-10" />
                                    <span className="text-xs">No photo yet</span>
                                </div>
                            )}
                            <div className="border-t border-white/10 p-3 admin-light:border-ink-900/10">
                                <p className="truncate text-sm font-semibold text-white admin-light:text-ink-900">
                                    {data.name || 'Product name'}
                                </p>
                                <p className="font-oswald text-base font-bold text-volt-500 admin-light:text-volt-800">{peso(data.base_price)}</p>
                            </div>
                        </div>
                        <label
                            htmlFor="image"
                            className="font-oswald mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/70 transition hover:border-volt-500 hover:text-white admin-light:border-ink-900/15 admin-light:text-ink-900/70 admin-light:hover:text-ink-900"
                        >
                            <PhotoIcon className="h-4 w-4" />
                            {preview ? 'Choose another' : 'Upload photo'}
                        </label>
                        <input id="image" type="file" accept="image/png,image/jpeg,image/webp" onChange={onImageChange} className="sr-only" />
                        <p className="mt-2 text-xs text-white/35 admin-light:text-ink-900/45">
                            Optional. JPG, PNG or WEBP, up to 4MB. Without one the shop shows a placeholder.
                        </p>
                        <InputError message={errors.image} className="mt-1" />
                    </Card>

                    <Card className="p-6">
                        <h2 className={sectionTitle}>After you create it</h2>
                        <ol className="mt-3 space-y-2 text-sm text-white/60 admin-light:text-ink-900/70">
                            <li className="flex gap-2">
                                <span className="font-oswald font-bold text-volt-500 admin-light:text-volt-800">1</span>
                                You'll land on its edit page.
                            </li>
                            <li className="flex gap-2">
                                <span className="font-oswald font-bold text-volt-500 admin-light:text-volt-800">2</span>
                                Add its sizes and colours with stock counts.
                            </li>
                        </ol>
                        <p className="mt-3 text-xs text-white/35 admin-light:text-ink-900/45">
                            A product with no sizes/colours has nothing to sell, so customers can't buy it yet.
                        </p>
                    </Card>
                </div>
            </form>
        </AdminLayout>
    );
}
