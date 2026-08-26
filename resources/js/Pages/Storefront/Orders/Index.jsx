import { Head, Link } from '@inertiajs/react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import { formatCentavos } from '@/utils/money';
import { statusChipClasses, formatStatusLabel } from '@/utils/orderStatus';

export default function OrdersIndex({ orders }) {
    return (
        <StorefrontLayout>
            <Head title="Your orders" />

            <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:py-16">
                <h1 className="font-display text-[clamp(2rem,7vw,4rem)] uppercase leading-[0.9] tracking-tighter text-white light:text-ink-900">
                    Your orders
                </h1>

                {orders.length === 0 ? (
                    <div className="py-20 text-center">
                        <p className="font-display text-xl uppercase tracking-[0.2em] text-white/30 light:text-ink-900/45">
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
                    <ul className="mt-12 divide-y divide-white/10 border-y border-white/10 light:divide-ink-900/10 light:border-ink-900/10">
                        {orders.map((order) => (
                            <li key={order.order_number}>
                                <Link
                                    href={route('orders.show', order.order_number)}
                                    className="group flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div>
                                        <p className="font-display text-lg uppercase tracking-wide text-white transition-colors group-hover:text-volt-500 light:text-ink-900 light:group-hover:text-volt-800">
                                            {order.order_number}
                                        </p>
                                        <p className="mt-1 text-xs uppercase tracking-[0.15em] text-white/35 light:text-ink-900/50">
                                            {order.placed_at} · {order.items_count}{' '}
                                            item{order.items_count === 1 ? '' : 's'}
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
