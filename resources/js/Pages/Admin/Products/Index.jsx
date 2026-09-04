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
                            <th className="py-3 pl-4 pr-2 sm:pl-6" />
                            <th className="px-3 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider admin-light:text-ink-900/50">Name</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider admin-light:text-ink-900/50">Category</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider admin-light:text-ink-900/50">Type</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider admin-light:text-ink-900/50">Base price</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider admin-light:text-ink-900/50">Variants</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider admin-light:text-ink-900/50">Total stock</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider admin-light:text-ink-900/50">Status</th>
                            {/* Sticky: on a narrow laptop screen this table is
                                wider than the viewport and the card scrolls
                                horizontally (Card's own overflow-x-auto) — a
                                real complaint was this action being scrolled
                                out of reach entirely. Pinning it to the right
                                edge of the scroll area means it's always
                                reachable without having to find the scrollbar
                                first. Needs its own opaque background (see the
                                td below) or scrolled-past cells show through it. */}
                            <th className="sticky right-0 bg-white/[0.04] py-3 pl-2 pr-4 admin-light:bg-ink-900/[0.04] sm:pr-6" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 admin-light:divide-ink-900/10">
                        {products.length === 0 && (
                            <tr>
                                <td colSpan={9} className="px-6 py-10 text-center text-sm text-white/40 admin-light:text-ink-900/50">
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
                                <td className="py-3 pl-4 pr-2 sm:pl-6">
                                    {product.image_path ? (
                                        <img
                                            src={product.image_path}
                                            alt=""
                                            className="h-10 w-10 rounded-md object-cover"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 rounded-md bg-white/[0.06] admin-light:bg-ink-900/[0.06]" />
                                    )}
                                </td>
                                <td className="px-3 py-3 text-sm font-medium text-white admin-light:text-ink-900">{product.name}</td>
                                <td className="px-3 py-3 text-sm text-white/50 capitalize admin-light:text-ink-900/60">{product.category}</td>
                                <td className="px-3 py-3 text-sm text-white/50 capitalize admin-light:text-ink-900/60">{product.type ?? '—'}</td>
                                <td className="px-3 py-3 text-sm text-white/50 admin-light:text-ink-900/60">{product.base_price_formatted}</td>
                                <td className="px-3 py-3 text-sm text-white/50 admin-light:text-ink-900/60">{product.variants_count}</td>
                                <td className="px-3 py-3 text-sm text-white/50 admin-light:text-ink-900/60">{product.total_stock}</td>
                                <td className="px-3 py-3">
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
                                <td className="sticky right-0 bg-ink-900 py-3 pl-2 pr-4 text-right text-sm admin-light:bg-white sm:pr-6">
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
