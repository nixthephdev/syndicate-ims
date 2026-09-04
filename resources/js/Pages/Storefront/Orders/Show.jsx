import { Head, Link, useForm } from '@inertiajs/react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import { HARDWARE_COLORS } from '@/Components/Customizer/hardwareColors';
import { formatCentavos } from '@/utils/money';
import { statusChipClasses, formatStatusLabel } from '@/utils/orderStatus';

function colorLabel(hex) {
    return HARDWARE_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.label ?? hex;
}

export default function OrderShow({ order }) {
    const { post, processing } = useForm({});

    const confirmPayment = (e) => {
        e.preventDefault();
        post(route('payment.confirm', order.order_number), {
            preserveScroll: true,
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

                {/* Payment. This is the PayMongo GCash seam — see
                    PaymentController; the button is a stand-in for the
                    hosted checkout and only exists outside production. */}
                {!order.is_paid && order.status === 'awaiting_payment' && (
                    <form
                        onSubmit={confirmPayment}
                        className="mt-10 border-2 border-volt-500 p-6"
                    >
                        <h2 className="font-display text-lg uppercase tracking-wide text-white light:text-ink-900">
                            Pay with GCash
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-white/50 light:text-ink-900/65">
                            Stock is deducted the moment payment is confirmed,
                            not before — so nothing is held for you until you
                            pay.
                        </p>
                        <button
                            type="submit"
                            disabled={processing}
                            className="mt-6 inline-flex items-center gap-3 bg-volt-500 px-8 py-4 font-display text-base uppercase tracking-[0.2em] text-ink-900 transition-transform hover:-translate-y-0.5 hover:bg-white light:hover:bg-ink-900 light:hover:text-white disabled:pointer-events-none disabled:opacity-40"
                        >
                            {processing ? 'Confirming' : 'Confirm payment'} →
                        </button>
                        <p className="mt-4 text-xs uppercase tracking-[0.15em] text-amber-300/70 light:text-amber-700/80">
                            Test mode — no real money moves.
                        </p>
                    </form>
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
            </div>
        </StorefrontLayout>
    );
}
