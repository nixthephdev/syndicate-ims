import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import OrderStatusBadge from '@/Components/Admin/OrderStatusBadge';
import PrimaryButton from '@/Components/Admin/PrimaryButton';
import SecondaryButton from '@/Components/Admin/SecondaryButton';
import { ArrowLeftIcon, CheckCircleIcon, XIcon } from '@/Components/Admin/icons';
import { HARDWARE_COLORS } from '@/Components/Customizer/hardwareColors';
import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';

/** hardwareColors.js is a plain data module, not a styled component — safe
 *  to share with the admin panel per CLAUDE.md's "shared hooks/utilities
 *  are fine; shared presentational components are not" rule. */
function colorLabel(hex) {
    return HARDWARE_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.label ?? hex;
}

export default function Show({ order, can }) {
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
                className="inline-flex items-center gap-1.5 text-sm text-volt-500 hover:text-volt-400 admin-light:text-volt-800 admin-light:hover:text-volt-800"
            >
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                All orders
            </Link>

            <div className="mt-4 grid gap-6 lg:grid-cols-3">
                {/* Items + totals */}
                <div className="lg:col-span-2">
                    <Card className="overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4 admin-light:border-ink-900/10">
                            <div className="flex items-center gap-3">
                                <h2 className="font-semibold text-white admin-light:text-ink-900">
                                    {order.order_number}
                                </h2>
                                <OrderStatusBadge status={order.status} />
                            </div>
                            <p className="text-sm text-white/40 admin-light:text-ink-900/50">
                                Placed {order.placed_at}
                            </p>
                        </div>

                        <table className="min-w-full divide-y divide-white/10 admin-light:divide-ink-900/10">
                            <thead className="bg-white/[0.04] admin-light:bg-ink-900/[0.04]">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40 admin-light:text-ink-900/50">
                                        Item
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40 admin-light:text-ink-900/50">
                                        Unit
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40 admin-light:text-ink-900/50">
                                        Qty
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/40 admin-light:text-ink-900/50">
                                        Line total
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10 admin-light:divide-ink-900/10">
                                {order.items.map((item, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4 text-sm font-medium text-white admin-light:text-ink-900">
                                            {item.name}
                                            {item.color && (
                                                <span className="ml-2 inline-flex items-center gap-1.5 text-xs font-normal text-white/40 admin-light:text-ink-900/50">
                                                    <span
                                                        className="h-2.5 w-2.5 rounded-full border border-white/15 admin-light:border-ink-900/15"
                                                        style={{ backgroundColor: item.color }}
                                                    />
                                                    {colorLabel(item.color)} requested
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-white/40 admin-light:text-ink-900/50">
                                            {item.unit_price_formatted}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-white/40 admin-light:text-ink-900/50">
                                            {item.quantity}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-white admin-light:text-ink-900">
                                            {item.line_total_formatted}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-white/[0.04] admin-light:bg-ink-900/[0.04]">
                                <tr>
                                    <td
                                        colSpan={3}
                                        className="px-6 py-3 text-right text-sm font-medium text-white/50 admin-light:text-ink-900/60"
                                    >
                                        Total
                                    </td>
                                    <td className="px-6 py-3 text-right text-base font-semibold text-white admin-light:text-ink-900">
                                        {order.total_formatted}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>

                        <p className="border-t border-white/10 bg-white/[0.04] px-6 py-3 text-xs text-white/40 admin-light:border-ink-900/10 admin-light:bg-ink-900/[0.04] admin-light:text-ink-900/50">
                            Item names and prices are snapshots taken when the
                            order was placed — they do not change if the product
                            is later renamed or repriced.
                        </p>
                    </Card>
                </div>

                {/* Customer + actions */}
                <div className="space-y-6">
                    <Card className="p-6">
                        <h2 className="text-sm font-semibold text-white admin-light:text-ink-900">Customer</h2>
                        <dl className="mt-3 space-y-2 text-sm">
                            <div>
                                <dt className="sr-only">Name</dt>
                                <dd className="text-white admin-light:text-ink-900">{order.customer_name}</dd>
                            </div>
                            <div>
                                <dt className="sr-only">Email</dt>
                                <dd className="text-white/40 admin-light:text-ink-900/50">{order.customer_email}</dd>
                            </div>
                            <div>
                                <dt className="sr-only">Phone</dt>
                                <dd className="text-white/40 admin-light:text-ink-900/50">{order.customer_phone}</dd>
                            </div>
                        </dl>

                        {order.notes && (
                            <div className="mt-4 border-t border-white/10 pt-4 admin-light:border-ink-900/10">
                                <p className="text-xs font-medium uppercase tracking-wide text-white/25 admin-light:text-ink-900/35">
                                    Notes
                                </p>
                                <p className="mt-1 text-sm italic text-white/50 admin-light:text-ink-900/60">
                                    "{order.notes}"
                                </p>
                            </div>
                        )}

                        {order.account && (
                            <p className="mt-4 border-t border-white/10 pt-4 text-xs text-white/25 admin-light:border-ink-900/10 admin-light:text-ink-900/35">
                                Account: {order.account.name} ({order.account.role})
                            </p>
                        )}
                    </Card>

                    <Card className="p-6">
                        <h2 className="text-sm font-semibold text-white admin-light:text-ink-900">Payment</h2>
                        <p className="mt-2 text-sm text-white/50 admin-light:text-ink-900/60">
                            {order.is_paid
                                ? `Paid ${order.paid_at}`
                                : 'Not paid yet.'}
                        </p>
                        <p className="mt-2 text-xs text-white/40 admin-light:text-ink-900/50">
                            {order.stock_committed
                                ? 'Stock for this order has been deducted.'
                                : 'No stock has been deducted for this order.'}
                        </p>

                        {Object.keys(order.paymongo).length > 0 && (
                            <dl className="mt-4 space-y-1 border-t border-white/10 pt-4 text-xs admin-light:border-ink-900/10">
                                {Object.entries(order.paymongo).map(([key, value]) => (
                                    <div key={key} className="flex justify-between gap-2">
                                        <dt className="text-white/25 admin-light:text-ink-900/35">
                                            {key.replace(/_/g, ' ')}
                                        </dt>
                                        <dd className="truncate font-mono text-white/50 admin-light:text-ink-900/60">
                                            {value}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                    </Card>

                    {(can.fulfil || can.cancel) && (
                        <Card className="p-6">
                            <h2 className="text-sm font-semibold text-white admin-light:text-ink-900">Actions</h2>

                            {can.fulfil && (
                                <PrimaryButton
                                    className="mt-3 w-full justify-center"
                                    disabled={processing}
                                    onClick={() => move('fulfilled')}
                                    icon={CheckCircleIcon}
                                >
                                    Mark fulfilled
                                </PrimaryButton>
                            )}

                            {can.cancel && (
                                <SecondaryButton
                                    className="mt-3 w-full"
                                    disabled={processing}
                                    onClick={() => move('cancelled')}
                                    icon={XIcon}
                                >
                                    Cancel order
                                </SecondaryButton>
                            )}

                            {/* A paid order cannot be cancelled here: that needs
                                the stock putting back and the money refunding,
                                and neither path exists yet. */}
                            {order.stock_committed && (
                                <p className="mt-3 text-xs text-white/25 admin-light:text-ink-900/35">
                                    Paid orders can't be cancelled here — that
                                    needs a refund and a restock, which aren't
                                    built yet.
                                </p>
                            )}
                        </Card>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
