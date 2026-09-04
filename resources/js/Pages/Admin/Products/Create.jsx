import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/Admin/PrimaryButton';
import { ArrowLeftIcon } from '@/Components/Admin/icons';
import { Head, Link, useForm } from '@inertiajs/react';

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

            <form onSubmit={submit} className="rounded-md border border-white/10 bg-ink-900 p-6 max-w-xl space-y-5 admin-light:border-ink-900/10 admin-light:bg-white">
                <div>
                    <InputLabel htmlFor="name" value="Name" />
                    <TextInput
                        id="name"
                        className="mt-1 block w-full"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        autoFocus
                    />
                    <InputError message={errors.name} className="mt-1" />
                </div>

                <div>
                    <InputLabel htmlFor="category" value="Category" />
                    <select
                        id="category"
                        className="mt-1 block w-full rounded-md border-white/15 bg-ink-900 text-white shadow-sm focus:border-volt-500 focus:ring-volt-500 admin-light:border-ink-900/15 admin-light:bg-white admin-light:text-ink-900"
                        value={data.category}
                        onChange={(e) => setData('category', e.target.value)}
                    >
                        {categories.map((c) => (
                            <option key={c} value={c} className="capitalize">
                                {c}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.category} className="mt-1" />
                </div>

                {isApparel && (
                    <div>
                        <InputLabel htmlFor="type" value="Type" />
                        <select
                            id="type"
                            className="mt-1 block w-full rounded-md border-white/15 bg-ink-900 text-white shadow-sm focus:border-volt-500 focus:ring-volt-500 admin-light:border-ink-900/15 admin-light:bg-white admin-light:text-ink-900"
                            value={data.type}
                            onChange={(e) => setData('type', e.target.value)}
                        >
                            {types.map((t) => (
                                <option key={t} value={t}>
                                    {typeLabels[t] ?? t}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-white/40 admin-light:text-ink-900/50">
                            Which shop section this appears under.
                        </p>
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
                    <p className="mt-1 text-xs text-white/40 admin-light:text-ink-900/50">
                        Individual variants can override this later.
                    </p>
                    <InputError message={errors.base_price} className="mt-1" />
                </div>

                <div>
                    <InputLabel htmlFor="description" value="Description" />
                    <textarea
                        id="description"
                        rows={3}
                        className="mt-1 block w-full rounded-md border-white/15 bg-ink-900 text-white shadow-sm focus:border-volt-500 focus:ring-volt-500 admin-light:border-ink-900/15 admin-light:bg-white admin-light:text-ink-900"
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                    />
                    <InputError message={errors.description} className="mt-1" />
                </div>

                <div>
                    <InputLabel htmlFor="image" value="Photo" />
                    {preview && (
                        <img
                            src={preview}
                            alt=""
                            className="mt-2 h-32 w-32 rounded-md border border-white/10 object-cover admin-light:border-ink-900/10"
                        />
                    )}
                    <input
                        id="image"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={onImageChange}
                        className="mt-2 block w-full text-sm text-white/70 file:mr-4 file:rounded-md file:border-0 file:bg-volt-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink-900 hover:file:bg-volt-400 admin-light:text-ink-900/70"
                    />
                    <p className="mt-1 text-xs text-white/40 admin-light:text-ink-900/50">
                        Optional — JPG, PNG or WEBP, up to 4MB. Products with no photo show a placeholder block on the storefront.
                    </p>
                    <InputError message={errors.image} className="mt-1" />
                </div>

                <div className="flex items-center gap-2">
                    <input
                        id="is_active"
                        type="checkbox"
                        className="rounded border-white/15 bg-ink-900 text-volt-500 shadow-sm focus:ring-volt-500 admin-light:border-ink-900/15 admin-light:bg-white"
                        checked={data.is_active}
                        onChange={(e) => setData('is_active', e.target.checked)}
                    />
                    <InputLabel htmlFor="is_active" value="Active (visible once a storefront exists)" />
                </div>

                <div className="flex items-center gap-4 pt-2">
                    <PrimaryButton type="submit" disabled={processing}>
                        Create Product
                    </PrimaryButton>
                    <Link
                        href={route('admin.products.index')}
                        className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 admin-light:text-ink-900/50 admin-light:hover:text-ink-900/80"
                    >
                        <ArrowLeftIcon className="h-3.5 w-3.5" />
                        Cancel
                    </Link>
                </div>
            </form>
        </AdminLayout>
    );
}
