import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import StockBadge from '@/Components/Admin/StockBadge';
import { ArrowRightIcon } from '@/Components/Admin/icons';
import { Head, Link } from '@inertiajs/react';

/**
 * Grouped by type rather than one flat table — Deck/Wheels/Trucks/Bolts read
 * as genuinely different inventories (14 decks vs. a single active Trucks
 * row), and a flat sort-by-name list would bury that.
 */
export default function Index({ components, typeLabels }) {
    const groups = Object.keys(typeLabels).map((type) => ({
        type,
        label: typeLabels[type],
        items: components.filter((c) => c.type === type),
    }));

    return (
        <AdminLayout header="Skate Components">
            <Head title="Admin · Skate Components" />

            <p className="mb-6 text-sm text-white/40 admin-light:text-ink-900/50">
                Edit-only — stock, price and threshold. Name and asset fields are locked because each row is tied to a
                real mesh inside the 3D customizer's model files.
            </p>

            {groups.map((group) => (
                <Card key={group.type} className="mb-8 overflow-x-auto">
                    <div className="px-6 py-3 border-b border-white/10 admin-light:border-ink-900/10">
                        <h2 className="font-semibold text-white admin-light:text-ink-900">
                            {group.label} <span className="font-normal text-white/25 admin-light:text-ink-900/35">({group.items.length})</span>
                        </h2>
                    </div>

                    {group.items.length === 0 ? (
                        <p className="px-6 py-6 text-sm text-white/40 admin-light:text-ink-900/50">No {group.label.toLowerCase()} rows seeded.</p>
                    ) : (
                        <table className="min-w-full divide-y divide-white/10 admin-light:divide-ink-900/10">
                            <thead className="bg-white/[0.04] admin-light:bg-ink-900/[0.04]">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider admin-light:text-ink-900/50">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider admin-light:text-ink-900/50">Price</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider admin-light:text-ink-900/50">Stock</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider admin-light:text-ink-900/50">Status</th>
                                    <th className="px-6 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10 admin-light:divide-ink-900/10">
                                {group.items.map((c) => (
                                    <tr key={c.id} className="hover:bg-white/[0.03] admin-light:hover:bg-ink-900/[0.03]">
                                        <td className="px-6 py-4 text-sm font-medium text-white admin-light:text-ink-900">{c.name}</td>
                                        <td className="px-6 py-4 text-sm text-white/50 admin-light:text-ink-900/60">{c.price_formatted}</td>
                                        <td className="px-6 py-4">
                                            <StockBadge
                                                stock={c.stock}
                                                isLowStock={c.is_low_stock}
                                                isOutOfStock={c.is_out_of_stock}
                                                threshold={c.low_stock_threshold}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={
                                                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ' +
                                                    (c.is_active
                                                        ? 'bg-green-500/10 text-green-400 ring-green-500/20'
                                                        : 'bg-white/[0.06] text-white/40 ring-white/10 admin-light:bg-ink-900/[0.06] admin-light:text-ink-900/50 admin-light:ring-ink-900/10')
                                                }
                                            >
                                                {c.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm">
                                            <Link
                                                href={route('admin.skateboard-components.edit', c.id)}
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
                    )}
                </Card>
            ))}
        </AdminLayout>
    );
}
