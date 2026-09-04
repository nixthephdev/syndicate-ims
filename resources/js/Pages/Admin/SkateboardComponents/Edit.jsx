import AdminLayout from '@/Layouts/AdminLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/Admin/PrimaryButton';
import { ArrowLeftIcon } from '@/Components/Admin/icons';
import { Head, Link, useForm } from '@inertiajs/react';

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

    return (
        <AdminLayout header={`Edit — ${component.name}`}>
            <Head title={`Admin · Edit ${component.name}`} />

            <form onSubmit={submit} className="rounded-md border border-white/10 bg-ink-900 p-6 max-w-xl space-y-5 admin-light:border-ink-900/10 admin-light:bg-white">
                {/* Read-only: type/glb_file/mesh_name are tied to a real mesh
                    inside the 3D model files. Editing them here isn't offered
                    at all — a typo would silently break the customizer. */}
                <div className="rounded-md bg-white/[0.04] border border-white/10 p-4 text-sm text-white/50 space-y-1 admin-light:bg-ink-900/[0.04] admin-light:border-ink-900/10 admin-light:text-ink-900/60">
                    <div>
                        <span className="text-white/25 admin-light:text-ink-900/35">Type:</span> {component.type_label}
                    </div>
                    <div>
                        <span className="text-white/25 admin-light:text-ink-900/35">Model file:</span> {component.glb_file}
                    </div>
                    <div>
                        <span className="text-white/25 admin-light:text-ink-900/35">Mesh name:</span> {component.mesh_name}
                    </div>
                </div>

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

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <InputLabel htmlFor="stock" value="Stock" />
                        <TextInput
                            id="stock"
                            type="number"
                            min="0"
                            className="mt-1 block w-full"
                            value={data.stock}
                            onChange={(e) => setData('stock', e.target.value)}
                        />
                        <InputError message={errors.stock} className="mt-1" />
                    </div>

                    <div>
                        <InputLabel htmlFor="low_stock_threshold" value="Low-stock threshold" />
                        <TextInput
                            id="low_stock_threshold"
                            type="number"
                            min="0"
                            className="mt-1 block w-full"
                            value={data.low_stock_threshold}
                            onChange={(e) => setData('low_stock_threshold', e.target.value)}
                        />
                        <InputError message={errors.low_stock_threshold} className="mt-1" />
                    </div>
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

                <div className="flex items-center gap-4 pt-2">
                    <PrimaryButton type="submit" disabled={processing}>
                        Save Changes
                    </PrimaryButton>
                    <Link
                        href={route('admin.skateboard-components.index')}
                        className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 admin-light:text-ink-900/50 admin-light:hover:text-ink-900/80"
                    >
                        <ArrowLeftIcon className="h-3.5 w-3.5" />
                        Back to list
                    </Link>
                </div>
            </form>
        </AdminLayout>
    );
}
