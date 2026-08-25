import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import OrderStatusBadge from '@/Components/Admin/OrderStatusBadge';
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

    const tab = (active) =>
        'px-3 py-1.5 rounded-md text-sm font-medium transition ' +
        (active
            ? 'bg-brand-600 text-white'
            : 'text-gray-600 hover:bg-gray-100');

    return (
        <AdminLayout header="Orders">
            <Head title="Admin · Orders" />

            {/* The two queues that actually need someone to act. */}
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                        Awaiting payment
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-amber-900">
                        {counts.awaiting_payment}
                    </p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
                        Paid — to hand over
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-blue-900">
                        {counts.paid}
                    </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Fulfilled
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">
                        {counts.fulfilled}
                    </p>
                </div>
            </div>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-1">
                    <button
                        type="button"
                        onClick={() => go({ q: filters.q || undefined })}
                        className={tab(!filters.status)}
                    >
                        All
                    </button>
                    {statuses.map((status) => (
                        <button
                            key={status}
                            type="button"
                            onClick={() => go({ ...filters, status })}
                            className={tab(filters.status === status)}
                        >
                            <span className="capitalize">
                                {status.replace(/_/g, ' ')}
                            </span>
                        </button>
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
                        className="w-64 rounded-md border-gray-300 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500"
                    />
                    <button
                        type="submit"
                        className="rounded-md bg-gray-800 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-gray-700"
                    >
                        Search
                    </button>
                </form>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {['Order', 'Customer', 'Items', 'Total', 'Status', 'Placed', ''].map(
                                (heading, i) => (
                                    <th
                                        key={i}
                                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                                    >
                                        {heading}
                                    </th>
                                )
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {orders.data.length === 0 && (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-6 py-10 text-center text-sm text-gray-500"
                                >
                                    No orders match this view.
                                </td>
                            </tr>
                        )}

                        {orders.data.map((order) => (
                            <tr key={order.order_number} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                    {order.order_number}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    <span className="block text-gray-700">
                                        {order.customer_name}
                                    </span>
                                    <span className="text-xs">{order.customer_email}</span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {order.items_count}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                    {order.total_formatted}
                                </td>
                                <td className="px-6 py-4">
                                    <OrderStatusBadge status={order.status} />
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {order.placed_at}
                                </td>
                                <td className="px-6 py-4 text-right text-sm">
                                    <Link
                                        href={route('admin.orders.show', order.order_number)}
                                        className="text-brand-600 hover:text-brand-700"
                                    >
                                        View →
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {orders.links.length > 3 && (
                <nav className="mt-4 flex flex-wrap gap-1">
                    {orders.links.map((link, i) => (
                        <Link
                            key={i}
                            href={link.url ?? '#'}
                            preserveScroll
                            className={
                                'rounded-md px-3 py-1.5 text-sm transition ' +
                                (link.active
                                    ? 'bg-brand-600 text-white'
                                    : link.url
                                    ? 'text-gray-600 hover:bg-gray-100'
                                    : 'cursor-default text-gray-300')
                            }
                            // Laravel's pagination labels contain &laquo; / &raquo;.
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </nav>
            )}
        </AdminLayout>
    );
}
