import AdminLayout from '@/Layouts/AdminLayout';
import OrderStatusBadge from '@/Components/Admin/OrderStatusBadge';
import StockBadge from '@/Components/Admin/StockBadge';
import { formatCentavos } from '@/utils/money';
import { Head, Link } from '@inertiajs/react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

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

function RevenueTrendChart({ revenueTrend }) {
    return (
        <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="day"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                        interval={4}
                    />
                    <YAxis
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        tickFormatter={(v) => (v === 0 ? '0' : `${Math.round(v / 100000)}k`)}
                    />
                    <Tooltip
                        formatter={(value) => [formatCentavos(value), 'Revenue']}
                        contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e5e7eb' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="revenue_centavos"
                        stroke="#2563eb"
                        strokeWidth={2}
                        fill="url(#revenueFill)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

function CategorySplit({ categorySplit }) {
    const apparel = categorySplit.apparel_centavos;
    const skateboard = categorySplit.skateboard_centavos;
    const total = apparel + skateboard;
    const apparelPct = total > 0 ? Math.round((apparel / total) * 100) : 0;

    return (
        <div className="space-y-4">
            {[
                { label: 'Apparel', value: apparel, pct: total > 0 ? apparelPct : 0 },
                { label: 'Skateboard', value: skateboard, pct: total > 0 ? 100 - apparelPct : 0 },
            ].map((row) => (
                <div key={row.label}>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{row.label}</span>
                        <span className="text-gray-500">{formatCentavos(row.value)}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-brand-600" style={{ width: `${row.pct}%` }} />
                    </div>
                </div>
            ))}
            {total === 0 && <p className="text-sm text-gray-500">No paid orders yet.</p>}
        </div>
    );
}

export default function Dashboard({ stats, lowStockItems, recentOrders, revenueTrend, categorySplit, topProducts }) {
    return (
        <AdminLayout header="Dashboard">
            <Head title="Admin Dashboard" />

            {/* Trading first — what came in and what needs acting on. Stock
                counts matter, but nobody opens a dashboard to learn how many
                variants exist. */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Revenue today" value={stats.revenue_today} />
                <StatCard label="Revenue all time" value={stats.revenue_total} />
                <StatCard label="Awaiting payment" value={stats.awaiting_payment} tone="warning" />
                <StatCard label="Paid — to hand over" value={stats.to_fulfil} />
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard label="Products" value={stats.products} />
                <StatCard label="Apparel variants" value={stats.variants} />
                <StatCard label="Skate components" value={stats.components} />
                <StatCard label="Low stock" value={stats.low_stock_count} tone="warning" />
                <StatCard label="Out of stock" value={stats.out_of_stock_count} tone="danger" />
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="font-semibold text-gray-900">Sales trend</h2>
                        <p className="text-sm text-gray-500">Revenue from paid orders, last 30 days.</p>
                    </div>
                    <div className="p-6">
                        <RevenueTrendChart revenueTrend={revenueTrend} />
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="font-semibold text-gray-900">Apparel vs. skateboard</h2>
                        <p className="text-sm text-gray-500">Share of all-time revenue.</p>
                    </div>
                    <div className="p-6">
                        <CategorySplit categorySplit={categorySplit} />
                    </div>
                </div>
            </div>

            <div className="mt-4 bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="font-semibold text-gray-900">Top products</h2>
                    <p className="text-sm text-gray-500">Units sold, all-time, paid orders only.</p>
                </div>
                {topProducts.length === 0 ? (
                    <p className="px-6 py-8 text-sm text-gray-500">No paid orders yet.</p>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {topProducts.map((product, i) => (
                            <li key={product.name} className="px-6 py-3 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-xs font-medium text-gray-400 tabular-nums w-4">{i + 1}</span>
                                    <span className="text-sm font-medium text-gray-900 truncate">{product.name}</span>
                                </div>
                                <span className="text-sm text-gray-500 shrink-0 tabular-nums">{product.units} sold</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="mt-8 bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold text-gray-900">Recent orders</h2>
                        <p className="text-sm text-gray-500">Objective 10 — the five most recent, whatever their status.</p>
                    </div>
                    <Link href={route('admin.orders.index')} className="text-sm text-brand-600 hover:text-brand-700">
                        All orders →
                    </Link>
                </div>

                {recentOrders.length === 0 ? (
                    <p className="px-6 py-8 text-sm text-gray-500">No orders yet.</p>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {recentOrders.map((order) => (
                            <li key={order.order_number} className="px-6 py-3 flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <Link
                                        href={route('admin.orders.show', order.order_number)}
                                        className="text-sm font-medium text-gray-900 hover:text-brand-600"
                                    >
                                        {order.order_number}
                                    </Link>
                                    <div className="text-xs text-gray-500">
                                        {order.customer_name} · {order.placed_at}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    <OrderStatusBadge status={order.status} />
                                    <span className="text-sm text-gray-900">{order.total_formatted}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
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
                            <li key={i} className="px-6 py-3 flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                    <div className="text-xs text-gray-500">threshold {item.threshold}</div>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    <StockBadge
                                        stock={item.stock}
                                        isLowStock={item.is_low_stock}
                                        isOutOfStock={item.is_out_of_stock}
                                        threshold={item.threshold}
                                    />
                                    {item.edit_url && (
                                        <Link href={item.edit_url} className="text-sm text-brand-600 hover:text-brand-700">
                                            Manage →
                                        </Link>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </AdminLayout>
    );
}
