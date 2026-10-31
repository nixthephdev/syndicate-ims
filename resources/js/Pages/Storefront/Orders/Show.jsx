import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import Modal from '@/Components/Storefront/Modal';
import { DangerButton, GhostButton, SubmitButton } from '@/Components/Storefront/FormControls';
import AddressFields from '@/Components/Storefront/AddressFields';
import { HARDWARE_COLORS } from '@/Components/Customizer/hardwareColors';
import { formatCentavos } from '@/utils/money';
import { statusChipClasses, formatStatusLabel } from '@/utils/orderStatus';
import { useLiveReload } from '@/utils/useLiveReload';
import OrderTracker from '@/Components/Storefront/OrderTracker';

function colorLabel(hex) {
    return HARDWARE_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.label ?? hex;
}

export default function OrderShow({ order, provinces }) {
    const { post: postCancel, processing: cancelling } = useForm({});
    const [changingAddress, setChangingAddress] = useState(false);

    // When the shop moves the order along ("Out for delivery"), the tracker
    // updates on its own — no reload.
    useLiveReload(['order']);

    // No cash at pickup (2026-10-31): a pickup order's balance is GCash only;
    // delivery may still pay the rider.
    const balanceTerms = order.fulfillment_method === 'delivery'
        ? 'by GCash, or in cash when it’s delivered'
        : 'by GCash before you pick it up';

    const addressForm = useForm({
        address_line: order.address.address_line ?? '',
        barangay: order.address.barangay ?? '',
        city: order.address.city ?? '',
        province: order.address.province ?? '',
        postal_code: order.address.postal_code ?? '',
    });

    // Sends the browser to PayMongo's GCash page (the server answers with
    // Inertia::location). Nothing is marked paid until PayMongo confirms it
    // on the way back — see Shop\PayMongoController.
    const { post: postPay, processing: paying } = useForm({});

    // The other half of a 50% deposit order — see BalancePaymentController.
    const { post: postBalance, processing: payingBalance } = useForm({});
    const payBalance = (e) => {
        e.preventDefault();
        postBalance(route('payment.balance.create', order.order_number), { preserveScroll: true });
    };

    const payWithGcash = (e) => {
        e.preventDefault();
        postPay(route('payment.paymongo.create', order.order_number), { preserveScroll: true });
    };

    const [confirmingCancel, setConfirmingCancel] = useState(false);

    const cancelOrder = (e) => {
        e.preventDefault();
        postCancel(route('orders.cancel', order.order_number), {
            preserveScroll: true,
            onFinish: () => setConfirmingCancel(false),
        });
    };

    const saveAddress = (e) => {
        e.preventDefault();
        addressForm.patch(route('orders.address.update', order.order_number), {
            preserveScroll: true,
            onSuccess: () => setChangingAddress(false),
        });
    };

    return (
        <StorefrontLayout>
            <Head title={`Order ${order.order_number}`} />

            <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
                <Link
                    href={route('orders.index')}
                    className="font-display text-xs uppercase tracking-[0.25em] text-white/30 transition-colors hover:text-volt-500 light:text-ink-900/45 light:hover:text-volt-800"
                >
                    ← Orders
                </Link>

                <div className="mt-6 flex flex-wrap items-center gap-4">
                    <h1 className="font-display text-[clamp(1.75rem,6vw,3rem)] uppercase leading-[0.9] tracking-tighter text-white light:text-ink-900">
                        {order.order_number}
                    </h1>
                    <span
                        className={
                            'px-3 py-1 font-display text-xs uppercase tracking-[0.2em] ' +
                            statusChipClasses(order.status)
                        }
                    >
                        {formatStatusLabel(order.status)}
                    </span>
                </div>

                <p className="mt-3 text-sm text-white/40 light:text-ink-900/55">
                    Placed {order.placed_at}
                    {order.paid_at && ` · Paid ${order.paid_at}`}
                </p>

                {/* Where the goods are — a different axis from the status
                    chip above, which is about money. Renders nothing until
                    stock is committed; see Order::trackingPayload(). */}
                {order.tracking && (
                    <div className="mt-8">
                        <OrderTracker tracking={order.tracking} />
                    </div>
                )}

                {/* Payment — GCash through PayMongo. A deposit order only
                    ever charges the 50% online, never the full total
                    (amount_due_now_centavos handles which). */}
                {order.status === 'awaiting_payment' && order.pays_online && (
                    <div className="mt-10 border-2 border-volt-500 p-6">
                        <h2 className="font-display text-lg uppercase tracking-wide text-white light:text-ink-900">
                            {order.requires_deposit
                                ? 'Pay your 50% deposit'
                                : `Pay ${formatCentavos(order.amount_due_now_centavos)}`}
                        </h2>

                        <p className="mt-2 text-sm leading-relaxed text-white/50 light:text-ink-900/65">
                            {order.requires_deposit ? (
                                <>
                                    A deposit of{' '}
                                    <span className="text-volt-500 light:text-volt-800">
                                        {formatCentavos(order.deposit_centavos)}
                                    </span>{' '}
                                    secures your order. The remaining{' '}
                                    {formatCentavos(order.balance_centavos)} is paid{' '}
                                    {balanceTerms}.
                                </>
                            ) : (
                                'Pay by GCash through PayMongo. Nothing is held for you until the payment goes through.'
                            )}
                        </p>

                        {order.payment_configured ? (
                            <form onSubmit={payWithGcash} className="mt-5">
                                <button
                                    type="submit"
                                    disabled={paying}
                                    className="inline-flex items-center gap-3 bg-volt-500 px-8 py-4 font-display text-base uppercase tracking-[0.2em] text-ink-900 transition-transform hover:-translate-y-0.5 hover:bg-white light:hover:bg-ink-900 light:hover:text-white disabled:pointer-events-none disabled:opacity-40"
                                >
                                    {paying ? 'Opening GCash' : 'Pay with GCash'} →
                                </button>
                                <p className="mt-3 text-xs text-white/35 light:text-ink-900/50">
                                    You'll be taken to PayMongo's secure GCash page, then
                                    brought back here.
                                </p>
                            </form>
                        ) : (
                            <p className="mt-5 border border-amber-400/40 bg-amber-400/[0.06] p-3 text-xs leading-relaxed text-amber-300 light:text-amber-700">
                                GCash payment isn't set up on this copy of the site yet
                                (no PayMongo key). Please contact the shop.
                            </p>
                        )}
                    </div>
                )}

                {order.status === 'deposit_paid' && (
                    <div className="mt-10 border-2 border-cyan-400/60 p-6">
                        <h2 className="font-display text-lg uppercase tracking-wide text-white light:text-ink-900">
                            Deposit paid
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-white/50 light:text-ink-900/65">
                            Your {formatCentavos(order.deposit_centavos)} deposit
                            is confirmed. The remaining{' '}
                            <span className="text-volt-500 light:text-volt-800">
                                {formatCentavos(order.balance_centavos)}
                            </span>{' '}
                            {order.fulfillment_method === 'delivery'
                                ? 'can be paid by GCash now, or in cash when it’s delivered.'
                                : 'is paid by GCash before you pick it up — we hand it over once it’s in.'}
                        </p>

                        {order.can_pay_balance && !order.payment_configured && (
                            <p className="mt-5 border border-amber-400/40 bg-amber-400/[0.06] p-3 text-xs leading-relaxed text-amber-300 light:text-amber-700">
                                GCash payment isn't set up on this copy of the site yet
                                (no PayMongo key). Please contact the shop.
                            </p>
                        )}

                        {order.can_pay_balance && order.payment_configured && (
                            <form onSubmit={payBalance} className="mt-5">
                                <button
                                    type="submit"
                                    disabled={payingBalance}
                                    className="inline-flex items-center gap-3 bg-volt-500 px-8 py-4 font-display text-base uppercase tracking-[0.2em] text-ink-900 transition-transform hover:-translate-y-0.5 hover:bg-white light:hover:bg-ink-900 light:hover:text-white disabled:pointer-events-none disabled:opacity-40"
                                >
                                    {payingBalance
                                        ? 'Opening GCash'
                                        : `Pay ${formatCentavos(order.balance_centavos)} with GCash`}{' '}
                                    →
                                </button>
                            </form>
                        )}
                    </div>
                )}

                {order.balance_paid_at && (
                    <p className="mt-4 text-xs uppercase tracking-[0.15em] text-white/40 light:text-ink-900/55">
                        Balance paid by GCash · {order.balance_paid_at}
                    </p>
                )}

                {/* Cancel — owner-only, and only before payment. Nothing has
                    been charged or taken off the shelf yet at this status, so
                    there's nothing to refund or restock. See
                    Shop\OrderController::cancel(). */}
                {order.can_cancel && (
                    <div className="mt-4">
                        <DangerButton type="button" onClick={() => setConfirmingCancel(true)}>
                            Cancel order
                        </DangerButton>
                    </div>
                )}

                <ul className="mt-12 divide-y divide-white/10 border-y border-white/10 light:divide-ink-900/10 light:border-ink-900/10">
                    {order.items.map((item, i) => (
                        <li key={i} className="flex justify-between gap-4 py-5">
                            <div>
                                <p className="text-white light:text-ink-900">{item.name}</p>
                                <p className="mt-1 text-xs uppercase tracking-[0.15em] text-white/35 light:text-ink-900/50">
                                    {formatCentavos(item.unit_price_centavos)} ×{' '}
                                    {item.quantity}
                                </p>
                                {item.color && (
                                    <p className="mt-1.5 flex items-center gap-2 text-xs text-white/50 light:text-ink-900/60">
                                        <span
                                            className="h-3 w-3 shrink-0 rounded-full border border-white/20 light:border-ink-900/20"
                                            style={{ backgroundColor: item.color }}
                                        />
                                        {colorLabel(item.color)} requested
                                    </p>
                                )}
                            </div>
                            <p className="shrink-0 font-display text-lg text-volt-500 light:text-volt-800">
                                {formatCentavos(item.line_total_centavos)}
                            </p>
                        </li>
                    ))}
                </ul>

                <div className="mt-8 flex items-baseline justify-between">
                    <span className="font-display text-sm uppercase tracking-[0.2em] text-white/50 light:text-ink-900/65">
                        Total
                    </span>
                    <span className="font-display text-3xl text-volt-500 light:text-volt-800">
                        {formatCentavos(order.total_centavos)}
                    </span>
                </div>

                <div className="mt-12 border-t border-white/10 pt-8 text-sm text-white/50 light:border-ink-900/10 light:text-ink-900/65">
                    <h2 className="font-display text-xs uppercase tracking-[0.25em] text-white/40 light:text-ink-900/55">
                        Contact
                    </h2>
                    <p className="mt-3 text-white/70 light:text-ink-900/80">{order.customer_name}</p>
                    <p>{order.customer_email}</p>
                    <p>{order.customer_phone}</p>
                    {order.notes && (
                        <p className="mt-4 italic text-white/40 light:text-ink-900/55">"{order.notes}"</p>
                    )}
                </div>

                <div className="mt-8 border-t border-white/10 pt-8 text-sm text-white/50 light:border-ink-900/10 light:text-ink-900/65">
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="font-display text-xs uppercase tracking-[0.25em] text-white/40 light:text-ink-900/55">
                            Delivery address
                        </h2>
                        {order.can_change_address && (
                            <button
                                type="button"
                                onClick={() => setChangingAddress(true)}
                                className="font-display text-xs uppercase tracking-[0.2em] text-volt-500 transition-colors hover:text-white light:text-volt-800 light:hover:text-ink-900"
                            >
                                {order.address.has_address ? 'Change address' : 'Add address'}
                            </button>
                        )}
                    </div>

                    {order.address.has_address ? (
                        <div className="mt-3 text-white/70 light:text-ink-900/80">
                            {order.address.address_line && <p>{order.address.address_line}</p>}
                            <p>
                                {[order.address.barangay, order.address.city].filter(Boolean).join(', ')}
                            </p>
                            <p>
                                {[order.address.province, order.address.postal_code].filter(Boolean).join(' ')}
                            </p>
                        </div>
                    ) : (
                        <p className="mt-3 text-white/40 light:text-ink-900/55">
                            No delivery address on file — this order is set up for pickup.
                        </p>
                    )}
                </div>
            </div>

            <Modal show={confirmingCancel} onClose={() => setConfirmingCancel(false)}>
                <form onSubmit={cancelOrder} className="p-6 sm:p-8">
                    <h2 className="font-display text-xl uppercase tracking-wide text-white light:text-ink-900">
                        Cancel this order?
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-white/50 light:text-ink-900/65">
                        {order.order_number} will be cancelled. This can't be undone — you'd need
                        to place a new order.
                    </p>
                    <div className="mt-8 flex justify-end gap-3">
                        <GhostButton type="button" onClick={() => setConfirmingCancel(false)}>
                            Keep order
                        </GhostButton>
                        <DangerButton type="submit" disabled={cancelling}>
                            {cancelling ? 'Cancelling' : 'Yes, cancel it'}
                        </DangerButton>
                    </div>
                </form>
            </Modal>

            <Modal show={changingAddress} onClose={() => setChangingAddress(false)}>
                <form onSubmit={saveAddress} className="p-6 sm:p-8">
                    <h2 className="font-display text-xl uppercase tracking-wide text-white light:text-ink-900">
                        Delivery address
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-white/50 light:text-ink-900/65">
                        Pick your province, city and barangay from the lists.
                    </p>

                    <div className="mt-6">
                        <AddressFields
                            idPrefix="modal_"
                            data={addressForm.data}
                            setData={addressForm.setData}
                            errors={addressForm.errors}
                            provinces={provinces}
                        />
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        <GhostButton type="button" onClick={() => setChangingAddress(false)}>
                            Cancel
                        </GhostButton>
                        <SubmitButton fullWidth={false} processing={addressForm.processing}>
                            Save address
                        </SubmitButton>
                    </div>
                </form>
            </Modal>
        </StorefrontLayout>
    );
}
