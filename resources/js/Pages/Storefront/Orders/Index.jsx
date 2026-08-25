import { Head, Link } from '@inertiajs/react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import { formatCentavos } from '@/utils/money';

const STATUS_STYLES = {
    paid: 'bg-volt-500 text-ink-900',
    fulfilled: 'bg-volt-500 text-ink-900',
    awaiting_payment: 'bg-amber-400 text-ink-900',
    pending: 'bg-white/15 text-white',
    cancelled: 'bg-white/10 text-white/50',
    failed: 'bg-red-500 text-white',
};

export default function OrdersIndex({ orders }) {
    return (
        <StorefrontLayout>
            <Head title="Your orders" />

            <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:py-16">
                <h1 className="font-display text-[clamp(2rem,7vw,4rem)] uppercase leading-[0.9] tracking-tighter text-white">
                    Your orders
                </h1>

                {orders.length === 0 ? (
                    <div className="py-20 text-center">
                        <p className="font-display text-xl uppercase tracking-[0.2em] text-white/30">
                            Nothing ordered yet.
                        </p>
                        <Link
                            href={route('shop.index')}
                            className="mt-8 inline-flex items-center gap-3 bg-volt-500 px-8 py-4 font-display text-base uppercase tracking-[0.2em] text-ink-900 transition-transform hover:-translate-y-0.5"
                        >
                            Go shopping →
                        </Link>
                    </div>
                ) : (
                    <ul className="mt-12 divide-y divide-white/10 border-y border-white/10">
                        {orders.map((order) => (
                            <li key={order.order_number}>
                                <Link
                                    href={route('orders.show', order.order_number)}
                                    className="group flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div>
                                        <p className="font-display text-lg uppercase tracking-wide text-white transition-colors group-hover:text-volt-500">
                                            {order.order_number}
                                        </p>
                                        <p className="mt-1 text-xs uppercase tracking-[0.15em] text-white/35">
                                            {order.placed_at} · {order.items_count}{' '}
                                            item{order.items_count === 1 ? '' : 's'}
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
                                            {order.status.replace('_', ' ')}
                                        </span>
                                        <span className="w-28 text-right font-display text-lg text-volt-500">
                                            {formatCentavos(order.total_centavos)}
                                        </span>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </StorefrontLayout>
    );
}
