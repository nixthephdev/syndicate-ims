import { Head, Link, usePage } from '@inertiajs/react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';

const STATUS_STYLES = {
    paid: 'bg-volt-500 text-ink-900',
    fulfilled: 'bg-volt-500 text-ink-900',
    awaiting_payment: 'bg-amber-400 text-ink-900',
    pending: 'bg-white/15 text-white',
    cancelled: 'bg-white/10 text-white/50',
    failed: 'bg-red-500 text-white',
};

export default function Account({ recentOrders, stats }) {
    const { auth } = usePage().props;
    const firstName = auth.user.name.split(' ')[0];

    return (
        <StorefrontLayout>
            <Head title="Your account" />

            <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
                <p className="flex items-center gap-3 font-display text-xs uppercase tracking-[0.35em] text-volt-500">
                    <span className="h-px w-8 bg-volt-500" />
                    Your account
                </p>

                <h1 className="mt-5 font-display text-[clamp(2rem,7vw,4.5rem)] uppercase leading-[0.9] tracking-tighter text-white">
                    Hey, {firstName}.
                </h1>

                <div className="mt-12 grid gap-4 sm:grid-cols-2">
                    <div className="border-2 border-white/10 p-6">
                        <p className="font-display text-xs uppercase tracking-[0.25em] text-white/40">
                            Orders placed
                        </p>
                        <p className="mt-2 font-display text-4xl text-white">
                            {stats.orders}
                        </p>
                    </div>
                    <div className="border-2 border-white/10 p-6">
                        <p className="font-display text-xs uppercase tracking-[0.25em] text-white/40">
                            Total spent
                        </p>
                        <p className="mt-2 font-display text-4xl text-volt-500">
                            {stats.spent_formatted}
                        </p>
                    </div>
                </div>

                <div className="mt-14 flex items-end justify-between gap-4">
                    <h2 className="font-display text-2xl uppercase tracking-wide text-white">
                        Recent orders
                    </h2>
                    {recentOrders.length > 0 && (
                        <Link
                            href={route('orders.index')}
                            className="font-display text-xs uppercase tracking-[0.2em] text-volt-500 hover:text-white"
                        >
                            See all →
                        </Link>
                    )}
                </div>

                {recentOrders.length === 0 ? (
                    <div className="mt-8 border-2 border-dashed border-white/10 px-6 py-16 text-center">
                        <p className="font-display text-lg uppercase tracking-[0.2em] text-white/30">
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
                    <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
                        {recentOrders.map((order) => (
                            <li key={order.order_number}>
                                <Link
                                    href={route('orders.show', order.order_number)}
                                    className="group flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div>
                                        <p className="font-display text-lg uppercase tracking-wide text-white transition-colors group-hover:text-volt-500">
                                            {order.order_number}
                                        </p>
                                        <p className="mt-1 text-xs uppercase tracking-[0.15em] text-white/35">
                                            {order.placed_at} · {order.items_count} item
                                            {order.items_count === 1 ? '' : 's'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <span
                                            className={
                                                'px-3 py-1 font-display text-[10px] uppercase tracking-[0.2em] ' +
                                                (STATUS_STYLES[order.status] ??
                                                    'bg-white/15 text-white')
                                            }
                                        >
                                            {order.status.replace(/_/g, ' ')}
                                        </span>
                                        <span className="w-28 text-right font-display text-lg text-volt-500">
                                            {order.total_formatted}
                                        </span>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="mt-14 flex flex-wrap gap-4 border-t border-white/10 pt-8">
                    <Link
                        href={route('profile.edit')}
                        className="border-2 border-white/15 px-6 py-3 font-display text-xs uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-volt-500 hover:text-volt-500"
                    >
                        Account settings
                    </Link>
                    <Link
                        href={route('shop.index')}
                        className="border-2 border-white/15 px-6 py-3 font-display text-xs uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-volt-500 hover:text-volt-500"
                    >
                        Keep shopping
                    </Link>
                </div>
            </div>
        </StorefrontLayout>
    );
}
