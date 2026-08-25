import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';

export default function Index({ products }) {
    return (
        <AdminLayout header="Products">
            <Head title="Admin · Products" />

            <div className="flex justify-end mb-4">
                <Link
                    href={route('admin.products.create')}
                    className="inline-flex items-center px-4 py-2 bg-brand-600 rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-brand-700 transition"
                >
                    + Add Product
                </Link>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base price</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variants</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total stock</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {products.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500">
                                    No products yet.{' '}
                                    <Link href={route('admin.products.create')} className="text-brand-600 hover:text-brand-700">
                                        Create the first one
                                    </Link>
                                    .
                                </td>
                            </tr>
                        )}

                        {products.map((product) => (
                            <tr key={product.id}>
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.name}</td>
                                <td className="px-6 py-4 text-sm text-gray-500 capitalize">{product.category}</td>
                                <td className="px-6 py-4 text-sm text-gray-500 capitalize">{product.type ?? '—'}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{product.base_price_formatted}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{product.variants_count}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{product.total_stock}</td>
                                <td className="px-6 py-4">
                                    <span
                                        className={
                                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ' +
                                            (product.is_active
                                                ? 'bg-green-50 text-green-700 ring-green-600/20'
                                                : 'bg-gray-100 text-gray-600 ring-gray-500/20')
                                        }
                                    >
                                        {product.is_active ? 'Active' : 'Archived'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right text-sm">
                                    <Link
                                        href={route('admin.products.edit', product.id)}
                                        className="text-brand-600 hover:text-brand-700"
                                    >
                                        Manage →
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
}
