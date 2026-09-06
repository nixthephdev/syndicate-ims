import { Head, Link, usePage } from '@inertiajs/react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import { statusChipClasses, formatStatusLabel } from '@/utils/orderStatus';

/**
 * Copy for each ID verification state. This card is the ONLY way a customer
 * reaches /verify-id — nothing blocks them, so nothing else pushes them
 * there. Worded as an invitation rather than a demand for the same reason.
 */
const ID_STATES = {
    none: {
        tone: 'border-white/10 light:border-ink-900/10',
        title: 'Verify your ID',
        body: 'Optional, and it helps us get your orders out faster. One photo of any government ID — only our staff ever see it.',
        cta: 'Verify my ID',
    },
    pending: {
        tone: 'border-amber-400/50 bg-amber-400/[0.05]',
        title: 'ID under review',
        body: 'We have your ID and someone will check it shortly. Nothing for you to do.',
        cta: 'View what you sent',
    },
    approved: {
        tone: 'border-volt-500/50 bg-volt-500/[0.05]',
        title: 'ID verified',
        body: null,
        cta: null,
    },
    rejected: {
        tone: 'border-red-500/50 bg-red-500/[0.05]',
        title: "We couldn't accept that ID",
        body: null,
        cta: 'Upload another photo',
    },
};

export default function Account({ recentOrders, stats, idVerification }) {
    const { auth } = usePage().props;
    const firstName = auth.user.name.split(' ')[0];
    const idState = ID_STATES[idVerification?.status] ?? ID_STATES.none;

    return (
        <StorefrontLayout>
            <Head title="Your account" />

            <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
                <p className="flex items-center gap-3 font-display text-xs uppercase tracking-[0.35em] text-volt-500 light:text-volt-800">
                    <span className="h-px w-8 bg-volt-500" />
                    Your account
                </p>

                <h1 className="mt-5 font-display text-[clamp(2rem,7vw,4.5rem)] uppercase leading-[0.9] tracking-tighter text-white light:text-ink-900">
                    Hey, {firstName}.
                </h1>

                <div className="mt-12 grid gap-4 sm:grid-cols-2">
                    <div className="border-2 border-white/10 p-6 light:border-ink-900/10">
                        <p className="font-display text-xs uppercase tracking-[0.25em] text-white/40 light:text-ink-900/55">
                            Orders placed
                        </p>
                        <p className="mt-2 font-display text-4xl text-white light:text-ink-900">
                            {stats.orders}
                        </p>
                    </div>
                    <div className="border-2 border-white/10 p-6 light:border-ink-900/10">
                        <p className="font-display text-xs uppercase tracking-[0.25em] text-white/40 light:text-ink-900/55">
                            Total spent
                        </p>
                        <p className="mt-2 font-display text-4xl text-volt-500 light:text-volt-800">
                            {stats.spent_formatted}
                        </p>
                    </div>
                </div>

                {/* The customer's only route into ID verification — see
                    AccountController. It gates nothing, so it invites rather
                    than demands, and says up front who sees the photo. */}
                <div className={`mt-4 border-2 p-6 ${idState.tone}`}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="font-display text-lg uppercase tracking-wide text-white light:text-ink-900">
                                {idState.title}
                            </p>

                            {idState.body && (
                                <p className="mt-2 max-w-prose text-sm leading-relaxed text-white/50 light:text-ink-900/65">
                                    {idState.body}
                                </p>
                            )}

                            {idVerification?.status === 'approved' && (
                                <p className="mt-2 text-sm text-white/50 light:text-ink-900/65">
                                    Checked{' '}
                                    {idVerification.reviewed_at ?? 'by our team'}. Nothing
                                    else needed.
                                </p>
                            )}

                            {idVerification?.status === 'rejected' && (
                                <p className="mt-2 max-w-prose text-sm leading-relaxed text-white/50 light:text-ink-900/65">
                                    {idVerification.rejection_reason}
                                </p>
                            )}
                        </div>

                        {idState.cta && (
                            <Link
                                href={route('verify-id.create')}
                                className="shrink-0 border-2 border-white/20 px-5 py-2.5 font-display text-xs uppercase tracking-[0.2em] text-white transition-colors hover:border-volt-500 hover:text-volt-500 light:border-ink-900/20 light:text-ink-900 light:hover:border-volt-800 light:hover:text-volt-800"
                            >
                                {idState.cta}
                            </Link>
                        )}
                    </div>
                </div>

                <div className="mt-14 flex items-end justify-between gap-4">
                    <h2 className="font-display text-2xl uppercase tracking-wide text-white light:text-ink-900">
                        Recent orders
                    </h2>
                    {recentOrders.length > 0 && (
                        <Link
                            href={route('orders.index')}
                            className="font-display text-xs uppercase tracking-[0.2em] text-volt-500 hover:text-white light:text-volt-800 light:hover:text-ink-900"
                        >
                            See all →
                        </Link>
                    )}
                </div>

                {recentOrders.length === 0 ? (
                    <div className="mt-8 border-2 border-dashed border-white/10 px-6 py-16 text-center light:border-ink-900/15">
                        <p className="font-display text-lg uppercase tracking-[0.2em] text-white/30 light:text-ink-900/45">
                            No orders yet
                        </p>
                        <Link
                            href={route('shop.index')}
                            className="mt-8 inline-flex items-center gap-3 bg-volt-500 px-8 py-4 font-display text-base uppercase tracking-[0.2em] text-ink-900 transition-transform hover:-translate-y-0.5"
                        >
                            Start shopping →
                        </Link>
                    </div>
                ) : (
                    <ul className="mt-8 divide-y divide-white/10 border-y border-white/10 light:divide-ink-900/10 light:border-ink-900/10">
                        {recentOrders.map((order) => (
                            <li key={order.order_number}>
                                <Link
                                    href={route('orders.show', order.order_number)}
                                    className="group flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div>
                                        <p className="font-display text-lg uppercase tracking-wide text-white transition-colors group-hover:text-volt-500 light:text-ink-900 light:group-hover:text-volt-800">
                                            {order.order_number}
                                        </p>
                                        <p className="mt-1 text-xs uppercase tracking-[0.15em] text-white/35 light:text-ink-900/50">
                                            {order.placed_at} · {order.items_count} item
                                            {order.items_count === 1 ? '' : 's'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <span
                                            className={
                                                'px-3 py-1 font-display text-[10px] uppercase tracking-[0.2em] ' +
                                                statusChipClasses(order.status)
                                            }
                                        >
                                            {formatStatusLabel(order.status)}
                                        </span>
                                        <span className="w-28 text-right font-display text-lg text-volt-500 light:text-volt-800">
                                            {order.total_formatted}
                                        </span>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="mt-14 flex flex-wrap gap-4 border-t border-white/10 pt-8 light:border-ink-900/10">
                    <Link
                        href={route('profile.edit')}
                        className="border-2 border-white/15 px-6 py-3 font-display text-xs uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-volt-500 hover:text-volt-500 light:border-ink-900/20 light:text-ink-900/70 light:hover:border-volt-800 light:hover:text-volt-800"
                    >
                        Account settings
                    </Link>
                    <Link
                        href={route('shop.index')}
                        className="border-2 border-white/15 px-6 py-3 font-display text-xs uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-volt-500 hover:text-volt-500 light:border-ink-900/20 light:text-ink-900/70 light:hover:border-volt-800 light:hover:text-volt-800"
                    >
                        Keep shopping
                    </Link>
                </div>
            </div>
        </StorefrontLayout>
    );
}
