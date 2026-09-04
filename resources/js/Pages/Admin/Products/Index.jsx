import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PrimaryButton from '@/Components/Admin/PrimaryButton';
import { PlusIcon, ArrowRightIcon } from '@/Components/Admin/icons';
import { Head, Link } from '@inertiajs/react';

export default function Index({ products }) {
    return (
        <AdminLayout header="Products">
            <Head title="Admin · Products" />

            <div className="flex justify-end mb-4">
                <PrimaryButton as="link" href={route('admin.products.create')} icon={PlusIcon}>
                    Add product
                </PrimaryButton>
            </div>

            <Card className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10 admin-light:divide-ink-900/10">
                    <thead className="bg-white/[0.04] admin-light:bg-ink-900/[0.04]">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider admin-light:text-ink-900/50">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider admin-light:text-ink-900/50">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider admin-light:text-ink-900/50">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider admin-light:text-ink-900/50">Base price</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider admin-light:text-ink-900/50">Variants</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider admin-light:text-ink-900/50">Total stock</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider admin-light:text-ink-900/50">Status</th>
                            <th className="px-6 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 admin-light:divide-ink-900/10">
                        {products.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-6 py-10 text-center text-sm text-white/40 admin-light:text-ink-900/50">
                                    No products yet.{' '}
                                    <Link href={route('admin.products.create')} className="text-volt-500 hover:text-volt-400">
                                        Create the first one
                                    </Link>
                                    .
                                </td>
                            </tr>
                        )}

                        {products.map((product) => (
                            <tr key={product.id} className="hover:bg-white/[0.03] admin-light:hover:bg-ink-900/[0.03]">
                                <td className="px-6 py-4 text-sm font-medium text-white admin-light:text-ink-900">{product.name}</td>
                                <td className="px-6 py-4 text-sm text-white/50 capitalize admin-light:text-ink-900/60">{product.category}</td>
                                <td className="px-6 py-4 text-sm text-white/50 capitalize admin-light:text-ink-900/60">{product.type ?? '—'}</td>
                                <td className="px-6 py-4 text-sm text-white/50 admin-light:text-ink-900/60">{product.base_price_formatted}</td>
                                <td className="px-6 py-4 text-sm text-white/50 admin-light:text-ink-900/60">{product.variants_count}</td>
                                <td className="px-6 py-4 text-sm text-white/50 admin-light:text-ink-900/60">{product.total_stock}</td>
                                <td className="px-6 py-4">
                                    <span
                                        className={
                                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ' +
                                            (product.is_active
                                                ? 'bg-green-500/10 text-green-400 ring-green-500/20'
                                                : 'bg-white/[0.06] text-white/40 ring-white/10 admin-light:bg-ink-900/[0.06] admin-light:text-ink-900/50 admin-light:ring-ink-900/10')
                                        }
                                    >
                                        {product.is_active ? 'Active' : 'Archived'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right text-sm">
                                    <Link
                                        href={route('admin.products.edit', product.id)}
                                        className="inline-flex items-center gap-1 text-volt-500 hover:text-volt-400"
                                    >
                                        Manage
                                        <ArrowRightIcon className="h-3.5 w-3.5" />
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </AdminLayout>
    );
}
