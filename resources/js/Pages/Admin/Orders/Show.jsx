import AdminLayout from '@/Layouts/AdminLayout';
import OrderStatusBadge from '@/Components/Admin/OrderStatusBadge';
import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';

export default function Show({ order, can }) {
    const { errors } = usePage().props;
    const [processing, setProcessing] = useState(false);

    // router.patch, not useForm: there is no form state here, just a one-shot
    // transition. useForm's patch() sends its own `data` and ignores a `data`
    // option, which would post an empty status.
    const move = (status) => {
        router.patch(
            route('admin.orders.status.update', order.order_number),
            { status },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
            }
        );
    };

    return (
        <AdminLayout header={`Order ${order.order_number}`}>
            <Head title={`Admin · ${order.order_number}`} />

            <Link
                href={route('admin.orders.index')}
                className="text-sm text-brand-600 hover:text-brand-700"
            >
                ← All orders
            </Link>

            {errors.status && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {errors.status}
                </div>
            )}

            <div className="mt-4 grid gap-6 lg:grid-cols-3">
                {/* Items + totals */}
                <div className="lg:col-span-2">
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <h2 className="font-semibold text-gray-900">
                                    {order.order_number}
                                </h2>
                                <OrderStatusBadge status={order.status} />
                            </div>
                            <p className="text-sm text-gray-500">
                                Placed {order.placed_at}
                            </p>
                        </div>

                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        Item
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        Unit
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        Qty
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                        Line total
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {order.items.map((item, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {item.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {item.unit_price_formatted}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {item.quantity}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-gray-900">
                                            {item.line_total_formatted}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50">
                                <tr>
                                    <td
                                        colSpan={3}
                                        className="px-6 py-3 text-right text-sm font-medium text-gray-600"
                                    >
                                        Total
                                    </td>
                                    <td className="px-6 py-3 text-right text-base font-semibold text-gray-900">
                                        {order.total_formatted}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>

                        <p className="border-t border-gray-200 bg-gray-50 px-6 py-3 text-xs text-gray-500">
                            Item names and prices are snapshots taken when the
                            order was placed — they do not change if the product
                            is later renamed or repriced.
                        </p>
                    </div>
                </div>

                {/* Customer + actions */}
                <div className="space-y-6">
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                        <h2 className="text-sm font-semibold text-gray-900">Customer</h2>
                        <dl className="mt-3 space-y-2 text-sm">
                            <div>
                                <dt className="sr-only">Name</dt>
                                <dd className="text-gray-900">{order.customer_name}</dd>
                            </div>
                            <div>
                                <dt className="sr-only">Email</dt>
                                <dd className="text-gray-500">{order.customer_email}</dd>
                            </div>
                            <div>
                                <dt className="sr-only">Phone</dt>
                                <dd className="text-gray-500">{order.customer_phone}</dd>
                            </div>
                        </dl>

                        {order.notes && (
                            <div className="mt-4 border-t border-gray-100 pt-4">
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                    Notes
                                </p>
                                <p className="mt-1 text-sm italic text-gray-600">
                                    "{order.notes}"
                                </p>
                            </div>
                        )}

                        {order.account && (
                            <p className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-400">
                                Account: {order.account.name} ({order.account.role})
                            </p>
                        )}
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                        <h2 className="text-sm font-semibold text-gray-900">Payment</h2>
                        <p className="mt-2 text-sm text-gray-600">
                            {order.is_paid
                                ? `Paid ${order.paid_at}`
                                : 'Not paid yet.'}
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                            {order.stock_committed
                                ? 'Stock for this order has been deducted.'
                                : 'No stock has been deducted for this order.'}
                        </p>

                        {Object.keys(order.paymongo).length > 0 && (
                            <dl className="mt-4 space-y-1 border-t border-gray-100 pt-4 text-xs">
                                {Object.entries(order.paymongo).map(([key, value]) => (
                                    <div key={key} className="flex justify-between gap-2">
                                        <dt className="text-gray-400">
                                            {key.replace(/_/g, ' ')}
                                        </dt>
                                        <dd className="truncate font-mono text-gray-600">
                                            {value}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                    </div>

                    {(can.fulfil || can.cancel) && (
                        <div className="rounded-lg border border-gray-200 bg-white p-6">
                            <h2 className="text-sm font-semibold text-gray-900">Actions</h2>

                            {can.fulfil && (
                                <button
                                    type="button"
                                    disabled={processing}
                                    onClick={() => move('fulfilled')}
                                    className="mt-3 w-full rounded-md bg-brand-600 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-brand-700 disabled:opacity-40"
                                >
                                    Mark fulfilled
                                </button>
                            )}

                            {can.cancel && (
                                <button
                                    type="button"
                                    disabled={processing}
                                    onClick={() => move('cancelled')}
                                    className="mt-3 w-full rounded-md border border-gray-300 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                                >
                                    Cancel order
                                </button>
                            )}

                            {/* A paid order cannot be cancelled here: that needs
                                the stock putting back and the money refunding,
                                and neither path exists yet. */}
                            {order.stock_committed && (
                                <p className="mt-3 text-xs text-gray-400">
                                    Paid orders can't be cancelled here — that
                                    needs a refund and a restock, which aren't
                                    built yet.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
