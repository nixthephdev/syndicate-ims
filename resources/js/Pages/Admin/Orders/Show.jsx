import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import OrderStatusBadge from '@/Components/Admin/OrderStatusBadge';
import IdStatusBadge from '@/Components/Admin/IdStatusBadge';
import PrimaryButton from '@/Components/Admin/PrimaryButton';
import SecondaryButton from '@/Components/Admin/SecondaryButton';
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, TruckIcon, XIcon } from '@/Components/Admin/icons';
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

    const confirmPayment = () => {
        router.patch(
            route('admin.orders.payment.confirm', order.order_number),
            {},
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
            }
        );
    };

    // The fulfillment axis — a different column and a different controller
    // from move() above, which changes payment status.
    const advanceStage = (stage) => {
        router.patch(
            route('admin.orders.fulfillment.update', order.order_number),
            { stage },
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

                        {order.address.has_address && (
                            <div className="mt-4 border-t border-white/10 pt-4 admin-light:border-ink-900/10">
                                <p className="text-xs font-medium uppercase tracking-wide text-white/25 admin-light:text-ink-900/35">
                                    Delivery address
                                </p>
                                <div className="mt-1 text-sm text-white/60 admin-light:text-ink-900/70">
                                    {order.address.address_line && <p>{order.address.address_line}</p>}
                                    <p>{[order.address.barangay, order.address.city].filter(Boolean).join(', ')}</p>
                                    <p>{[order.address.province, order.address.postal_code].filter(Boolean).join(' ')}</p>
                                </div>
                            </div>
                        )}

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
                        <p className="mt-2 text-sm capitalize text-white/60 admin-light:text-ink-900/70">
                            {order.fulfillment_method}
                            {' · '}
                            {order.payment_method_label}
                            {order.requires_deposit ? ' · 50% deposit' : ''}
                        </p>
                        {order.deposit_formatted && (
                            <p className="mt-1 text-xs text-white/40 admin-light:text-ink-900/50">
                                Deposit {order.deposit_formatted} · Balance {order.balance_formatted}
                                {order.status === 'deposit_paid' ? ' (due in cash on delivery)' : ''}
                            </p>
                        )}
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

                        {/* The customer's receipt. Check it against the shop's
                            OWN GCash/bank account before confirming — this
                            image is a claim, not proof of anything. */}
                        {order.needs_payment_proof && (
                            <div className="mt-4 border-t border-white/10 pt-4 admin-light:border-ink-900/10">
                                {order.payment_proof_url ? (
                                    <>
                                        <p className="text-xs uppercase tracking-widest text-white/40 admin-light:text-ink-900/55">
                                            Customer's receipt · {order.payment_proof_uploaded_at}
                                        </p>
                                        {order.payment_reference && (
                                            <p className="mt-1 text-xs text-white/50 admin-light:text-ink-900/65">
                                                Ref: <span className="font-mono">{order.payment_reference}</span>
                                            </p>
                                        )}
                                        <a href={order.payment_proof_url} target="_blank" rel="noreferrer">
                                            <img
                                                src={order.payment_proof_url}
                                                alt="Payment receipt the customer uploaded"
                                                className="mt-2 w-full rounded-md border border-white/10 bg-black/20 object-contain admin-light:border-ink-900/10 admin-light:bg-ink-900/[0.03]"
                                            />
                                        </a>
                                        <p className="mt-2 text-xs text-white/25 admin-light:text-ink-900/40">
                                            Verify this against the shop's own account
                                            before confirming — a screenshot proves nothing
                                            on its own.
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-xs text-white/30 admin-light:text-ink-900/45">
                                        No receipt uploaded yet.
                                    </p>
                                )}
                            </div>
                        )}
                    </Card>

                    {/* Buyer ID, reviewed alongside the order rather than as a
                        gate before it — the customer is never blocked from
                        ordering while this is pending. */}
                    {order.customer_id_verification && (
                        <Card className="p-6">
                            <h2 className="text-sm font-semibold text-white admin-light:text-ink-900">
                                Buyer ID
                            </h2>
                            <div className="mt-2">
                                <IdStatusBadge status={order.customer_id_verification.status} />
                            </div>

                            {order.customer_id_verification.photo_url ? (
                                <>
                                    <p className="mt-3 text-xs text-white/40 admin-light:text-ink-900/55">
                                        {order.customer_id_verification.id_type_label}
                                        {order.customer_id_verification.submitted_at &&
                                            ` · ${order.customer_id_verification.submitted_at}`}
                                    </p>
                                    <a
                                        href={order.customer_id_verification.photo_url}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <img
                                            src={order.customer_id_verification.photo_url}
                                            alt="Buyer's submitted ID"
                                            className="mt-2 w-full rounded-md border border-white/10 bg-black/20 object-contain admin-light:border-ink-900/10 admin-light:bg-ink-900/[0.03]"
                                        />
                                    </a>
                                </>
                            ) : (
                                <p className="mt-3 text-xs text-white/30 admin-light:text-ink-900/45">
                                    This customer hasn't uploaded an ID.
                                </p>
                            )}

                            <Link
                                href={route(
                                    'admin.id-verifications.show',
                                    order.customer_id_verification.user_id
                                )}
                                className="mt-3 inline-block text-sm font-medium text-volt-500 hover:underline admin-light:text-volt-800"
                            >
                                Review this ID →
                            </Link>
                        </Card>
                    )}

                    {/* Where the order physically is. Separate card from
                        Actions because it's a separate axis from payment —
                        see Admin\OrderFulfillmentController. */}
                    {order.tracking && (
                        <Card className="p-6">
                            <h2 className="text-sm font-semibold text-white admin-light:text-ink-900">
                                Fulfillment
                            </h2>
                            <p className="mt-1 text-xs uppercase tracking-widest text-volt-500 admin-light:text-volt-800">
                                {order.tracking.stage_label}
                            </p>

                            <ol className="mt-4 space-y-2">
                                {order.tracking.steps.map((step) => (
                                    <li key={step.key} className="flex items-center gap-2.5">
                                        <span
                                            className={
                                                'h-2 w-2 shrink-0 rounded-full ' +
                                                (step.done
                                                    ? 'bg-volt-500'
                                                    : 'bg-white/20 admin-light:bg-ink-900/20')
                                            }
                                        />
                                        <span
                                            className={
                                                'text-xs ' +
                                                (step.current
                                                    ? 'font-semibold text-white admin-light:text-ink-900'
                                                    : step.done
                                                      ? 'text-white/60 admin-light:text-ink-900/65'
                                                      : 'text-white/30 admin-light:text-ink-900/40')
                                            }
                                        >
                                            {step.label}
                                        </span>
                                    </li>
                                ))}
                            </ol>

                            {order.tracking.next_stage && (
                                <PrimaryButton
                                    className="mt-4 w-full justify-center"
                                    disabled={processing}
                                    onClick={() => advanceStage(order.tracking.next_stage)}
                                    icon={
                                        order.tracking.next_stage === 'completed'
                                            ? CheckCircleIcon
                                            : TruckIcon
                                    }
                                >
                                    Mark as {order.tracking.next_stage_label}
                                </PrimaryButton>
                            )}
                        </Card>
                    )}

                    {(can.fulfil || can.cancel || can.confirm_payment) && (
                        <Card className="p-6">
                            <h2 className="text-sm font-semibold text-white admin-light:text-ink-900">Actions</h2>

                            {can.confirm_payment && (
                                <PrimaryButton
                                    className="mt-3 w-full justify-center"
                                    disabled={processing}
                                    onClick={confirmPayment}
                                    icon={CheckCircleIcon}
                                >
                                    Confirm payment received
                                </PrimaryButton>
                            )}

                            {/* Skip-to-done. Hidden when the tracker's own
                                next step already IS "completed", or the two
                                buttons would be the same action twice. */}
                            {can.fulfil && order.tracking?.next_stage !== 'completed' && (
                                <SecondaryButton
                                    className="mt-3 w-full"
                                    disabled={processing}
                                    onClick={() => move('fulfilled')}
                                    icon={ArrowRightIcon}
                                >
                                    Skip to fulfilled
                                </SecondaryButton>
                            )}

                            {can.fulfil && order.status === 'deposit_paid' && (
                                <p className="mt-2 text-xs text-white/25 admin-light:text-ink-900/35">
                                    Marking this delivered confirms the{' '}
                                    {order.balance_formatted} cash balance was
                                    collected.
                                </p>
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
