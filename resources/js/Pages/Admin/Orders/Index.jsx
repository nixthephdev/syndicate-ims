import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import OrderStatusBadge from '@/Components/Admin/OrderStatusBadge';
import FilterTab from '@/Components/Admin/FilterTabs';
import Pagination from '@/Components/Admin/Pagination';
import PrimaryButton from '@/Components/Admin/PrimaryButton';
import { MagnifyingGlassIcon, ArrowRightIcon } from '@/Components/Admin/icons';
import { Head, Link, router } from '@inertiajs/react';

export default function Index({ orders, filters, statuses, counts }) {
    const [term, setTerm] = useState(filters.q ?? '');

    const go = (params) => {
        router.get(route('admin.orders.index'), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const search = (e) => {
        e.preventDefault();
        go({ ...filters, q: term || undefined });
    };

    return (
        <AdminLayout header="Orders">
            <Head title="Admin · Orders" />

            {/* The two queues that actually need someone to act. */}
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-amber-400">
                        Awaiting payment
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-amber-300">
                        {counts.awaiting_payment}
                    </p>
                </div>
                <div className="rounded-md border border-blue-500/20 bg-blue-500/10 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-400">
                        Paid — to hand over
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-blue-300">
                        {counts.paid}
                    </p>
                </div>
                <Card className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-white/40 admin-light:text-ink-900/50">
                        Fulfilled
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-white admin-light:text-ink-900">
                        {counts.fulfilled}
                    </p>
                </Card>
            </div>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-1">
                    <FilterTab active={!filters.status} onClick={() => go({ q: filters.q || undefined })}>
                        All
                    </FilterTab>
                    {statuses.map((status) => (
                        <FilterTab key={status} active={filters.status === status} onClick={() => go({ ...filters, status })}>
                            <span className="capitalize">{status.replace(/_/g, ' ')}</span>
                        </FilterTab>
                    ))}
                </div>

                <form onSubmit={search} className="flex gap-2">
                    <label htmlFor="q" className="sr-only">
                        Search orders
                    </label>
                    <input
                        id="q"
                        type="search"
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        placeholder="Order no., name or email"
                        className="w-64 rounded-md border-white/15 bg-ink-900 text-sm text-white shadow-sm placeholder-white/30 focus:border-volt-500 focus:ring-volt-500 admin-light:border-ink-900/15 admin-light:bg-white admin-light:text-ink-900 admin-light:placeholder-ink-900/30"
                    />
                    <PrimaryButton type="submit" icon={MagnifyingGlassIcon} aria-label="Search" />
                </form>
            </div>

            <Card className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10 admin-light:divide-ink-900/10">
                    <thead className="bg-white/[0.04] admin-light:bg-ink-900/[0.04]">
                        <tr>
                            {['Order', 'Customer', 'Items', 'Total', 'Status', 'Placed', ''].map(
                                (heading, i) => (
                                    <th
                                        key={i}
                                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40 admin-light:text-ink-900/50"
                                    >
                                        {heading}
                                    </th>
                                )
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 admin-light:divide-ink-900/10">
                        {orders.data.length === 0 && (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-6 py-10 text-center text-sm text-white/40 admin-light:text-ink-900/50"
                                >
                                    No orders match this view.
                                </td>
                            </tr>
                        )}

                        {orders.data.map((order) => (
                            <tr key={order.order_number} className="hover:bg-white/[0.03] admin-light:hover:bg-ink-900/[0.03]">
                                <td className="px-6 py-4 text-sm font-medium text-white admin-light:text-ink-900">
                                    {order.order_number}
                                </td>
                                <td className="px-6 py-4 text-sm text-white/40 admin-light:text-ink-900/50">
                                    <span className="block text-white/70 admin-light:text-ink-900/75">
                                        {order.customer_name}
                                    </span>
                                    <span className="text-xs">{order.customer_email}</span>
                                </td>
                                <td className="px-6 py-4 text-sm text-white/40 admin-light:text-ink-900/50">
                                    {order.items_count}
                                </td>
                                <td className="px-6 py-4 text-sm text-white admin-light:text-ink-900">
                                    {order.total_formatted}
                                </td>
                                <td className="px-6 py-4">
                                    <OrderStatusBadge status={order.status} />
                                </td>
                                <td className="px-6 py-4 text-sm text-white/40 admin-light:text-ink-900/50">
                                    {order.placed_at}
                                </td>
                                <td className="px-6 py-4 text-right text-sm">
                                    <Link
                                        href={route('admin.orders.show', order.order_number)}
                                        className="inline-flex items-center gap-1 text-volt-500 hover:text-volt-400"
                                    >
                                        View
                                        <ArrowRightIcon className="h-3.5 w-3.5" />
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            <Pagination links={orders.links} />
        </AdminLayout>
    );
}
