import AdminLayout from '@/Layouts/AdminLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/Admin/PrimaryButton';
import { ArrowLeftIcon, ArchiveBoxIcon } from '@/Components/Admin/icons';
import VariantsSection from './Partials/VariantsSection';
import { Head, Link, router, useForm } from '@inertiajs/react';

export default function Edit({ product, categories, types, typeLabels, variants }) {
    const { data, setData, patch, processing, errors } = useForm({
        name: product.name,
        description: product.description ?? '',
        category: product.category,
        type: product.type ?? (types[0] ?? ''),
        base_price: product.base_price,
        is_active: product.is_active,
    });

    const isApparel = data.category === 'apparel';

    function submit(e) {
        e.preventDefault();
        patch(route('admin.products.update', product.id));
    }

    function archive() {
        if (!confirm(`Archive "${product.name}"? It will no longer appear in the catalogue, but order history is preserved.`)) {
            return;
        }
        router.delete(route('admin.products.destroy', product.id));
    }

    return (
        <AdminLayout header={`Edit — ${product.name}`}>
            <Head title={`Admin · Edit ${product.name}`} />

            <form onSubmit={submit} className="rounded-md border border-white/10 bg-ink-900 p-6 max-w-xl space-y-5 admin-light:border-ink-900/10 admin-light:bg-white">
                <div>
                    <InputLabel htmlFor="name" value="Name" />
                    <TextInput
                        id="name"
                        className="mt-1 block w-full"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
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

                <div className="flex items-center gap-2">
                    <input
                        id="is_active"
                        type="checkbox"
                        className="rounded border-white/15 bg-ink-900 text-volt-500 shadow-sm focus:ring-volt-500 admin-light:border-ink-900/15 admin-light:bg-white"
                        checked={data.is_active}
                        onChange={(e) => setData('is_active', e.target.checked)}
                    />
                    <InputLabel htmlFor="is_active" value="Active" />
                </div>

                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-4">
                        <PrimaryButton type="submit" disabled={processing}>
                            Save Changes
                        </PrimaryButton>
                        <Link
                            href={route('admin.products.index')}
                            className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 admin-light:text-ink-900/50 admin-light:hover:text-ink-900/80"
                        >
                            <ArrowLeftIcon className="h-3.5 w-3.5" />
                            Back to list
                        </Link>
                    </div>

                    <button
                        type="button"
                        onClick={archive}
                        className="inline-flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300"
                    >
                        <ArchiveBoxIcon className="h-3.5 w-3.5" />
                        Archive product
                    </button>
                </div>
            </form>

            <VariantsSection productId={product.id} variants={variants} />
        </AdminLayout>
    );
}
