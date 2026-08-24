import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';

function StatCard({ label, value, tone = 'default' }) {
    const toneClasses = {
        default: 'text-gray-900',
        warning: 'text-amber-600',
        danger: 'text-red-600',
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 px-6 py-5">
            <div className="text-sm text-gray-500">{label}</div>
            <div className={`mt-1 text-3xl font-semibold ${toneClasses[tone]}`}>{value}</div>
        </div>
    );
}

export default function Dashboard({ stats, lowStockItems }) {
    return (
        <AdminLayout header="Dashboard">
            <Head title="Admin Dashboard" />

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard label="Products" value={stats.products} />
                <StatCard label="Apparel variants" value={stats.variants} />
                <StatCard label="Skate components" value={stats.components} />
                <StatCard label="Low stock" value={stats.low_stock_count} tone="warning" />
                <StatCard label="Out of stock" value={stats.out_of_stock_count} tone="danger" />
            </div>

            <div className="mt-8 bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="font-semibold text-gray-900">Needs restocking</h2>
                    <p className="text-sm text-gray-500">Objective 4 — items at or below their low-stock threshold.</p>
                </div>

                {lowStockItems.length === 0 ? (
                    <p className="px-6 py-8 text-sm text-gray-500">Nothing is low on stock right now.</p>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {lowStockItems.map((item, i) => (
                            <li key={i} className="px-6 py-3 flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                    <div className="text-xs text-gray-500">
                                        {item.stock} left · threshold {item.threshold}
                                    </div>
                                </div>
                                {item.edit_url && (
                                    <Link href={item.edit_url} className="text-sm text-brand-600 hover:text-brand-700">
                                        Manage →
                                    </Link>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </AdminLayout>
    );
}
