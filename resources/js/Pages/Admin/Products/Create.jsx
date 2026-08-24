import AdminLayout from '@/Layouts/AdminLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Create({ categories }) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        category: categories[0] ?? '',
        base_price: '',
        is_active: true,
    });

    function submit(e) {
        e.preventDefault();
        post(route('admin.products.store'));
    }

    return (
        <AdminLayout header="Add Product">
            <Head title="Admin · Add Product" />

            <form onSubmit={submit} className="bg-white rounded-lg border border-gray-200 p-6 max-w-xl space-y-5">
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
                        className="mt-1 block w-full border-gray-300 focus:border-brand-500 focus:ring-brand-500 rounded-md shadow-sm"
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
                    <p className="mt-1 text-xs text-gray-500">
                        Individual variants can override this later.
                    </p>
                    <InputError message={errors.base_price} className="mt-1" />
                </div>

                <div>
                    <InputLabel htmlFor="description" value="Description" />
                    <textarea
                        id="description"
                        rows={3}
                        className="mt-1 block w-full border-gray-300 focus:border-brand-500 focus:ring-brand-500 rounded-md shadow-sm"
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                    />
                    <InputError message={errors.description} className="mt-1" />
                </div>

                <div className="flex items-center gap-2">
                    <input
                        id="is_active"
                        type="checkbox"
                        className="rounded border-gray-300 text-brand-600 shadow-sm focus:ring-brand-500"
                        checked={data.is_active}
                        onChange={(e) => setData('is_active', e.target.checked)}
                    />
                    <InputLabel htmlFor="is_active" value="Active (visible once a storefront exists)" />
                </div>

                <div className="flex items-center gap-4 pt-2">
                    <button
                        type="submit"
                        disabled={processing}
                        className="inline-flex items-center px-4 py-2 bg-brand-600 rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-brand-700 disabled:opacity-50 transition"
                    >
                        Create Product
                    </button>
                    <Link href={route('admin.products.index')} className="text-sm text-gray-500 hover:text-gray-700">
                        Cancel
                    </Link>
                </div>
            </form>
        </AdminLayout>
    );
}
