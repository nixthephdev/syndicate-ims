import AdminLayout from '@/Layouts/AdminLayout';
import StockBadge from '@/Components/Admin/StockBadge';
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

            <p className="mb-6 text-sm text-gray-500">
                Edit-only — stock, price and threshold. Name and asset fields are locked because each row is tied to a
                real mesh inside the 3D customizer's model files.
            </p>

            {groups.map((group) => (
                <div key={group.type} className="mb-8 bg-white rounded-lg border border-gray-200 overflow-x-auto">
                    <div className="px-6 py-3 border-b border-gray-200">
                        <h2 className="font-semibold text-gray-900">
                            {group.label} <span className="font-normal text-gray-400">({group.items.length})</span>
                        </h2>
                    </div>

                    {group.items.length === 0 ? (
                        <p className="px-6 py-6 text-sm text-gray-500">No {group.label.toLowerCase()} rows seeded.</p>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {group.items.map((c) => (
                                    <tr key={c.id}>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{c.price_formatted}</td>
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
                                                        ? 'bg-green-50 text-green-700 ring-green-600/20'
                                                        : 'bg-gray-100 text-gray-600 ring-gray-500/20')
                                                }
                                            >
                                                {c.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm">
                                            <Link href={route('admin.skateboard-components.edit', c.id)} className="text-brand-600 hover:text-brand-700">
                                                Manage →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            ))}
        </AdminLayout>
    );
}
