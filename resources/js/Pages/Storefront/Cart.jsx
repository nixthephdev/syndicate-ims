import { Head, Link, router, usePage } from '@inertiajs/react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import { formatCentavos } from '@/utils/money';

export default function Cart({ lines, subtotal_centavos }) {
    const { auth } = usePage().props;

    const setQuantity = (key, quantity) => {
        router.patch(
            route('cart.update'),
            { key, quantity },
            { preserveScroll: true }
        );
    };

    const remove = (key) => {
        router.delete(route('cart.destroy'), {
            data: { key },
            preserveScroll: true,
        });
    };

    const blocked = lines.some((line) => line.exceeds_stock);

    if (lines.length === 0) {
        return (
            <StorefrontLayout>
                <Head title="Cart" />
                <div className="mx-auto max-w-3xl px-4 py-28 text-center sm:px-6">
                    <h1 className="font-display text-[clamp(2rem,7vw,4rem)] uppercase leading-[0.9] tracking-tighter text-white">
                        Your cart is
                        <br />
                        <span className="text-volt-500">empty.</span>
                    </h1>
                    <Link
                        href={route('shop.index')}
                        className="mt-10 inline-flex items-center gap-3 bg-volt-500 px-8 py-4 font-display text-base uppercase tracking-[0.2em] text-ink-900 transition-transform hover:-translate-y-0.5"
                    >
                        Go shopping →
                    </Link>
                </div>
            </StorefrontLayout>
        );
    }

    return (
        <StorefrontLayout>
            <Head title="Cart" />

            <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
                <h1 className="font-display text-[clamp(2rem,7vw,4rem)] uppercase leading-[0.9] tracking-tighter text-white">
                    Your cart
                </h1>

                <ul className="mt-12 divide-y divide-white/10 border-y border-white/10">
                    {lines.map((line) => (
                        <li
                            key={line.key}
                            className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="min-w-0">
                                <p className="font-display text-lg uppercase tracking-wide text-white">
                                    {line.name}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-[0.15em] text-white/35">
                                    {formatCentavos(line.unit_price_centavos)} each
                                </p>
                                {line.exceeds_stock && (
                                    <p className="mt-2 text-xs font-medium text-red-400">
                                        Only {line.available_stock} left — reduce
                                        the quantity to continue.
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-6">
                                <div>
                                    <label
                                        htmlFor={`qty-${line.key}`}
                                        className="sr-only"
                                    >
                                        Quantity for {line.name}
                                    </label>
                                    <select
                                        id={`qty-${line.key}`}
                                        value={line.quantity}
                                        onChange={(e) =>
                                            setQuantity(
                                                line.key,
                                                Number(e.target.value)
                                            )
                                        }
                                        className="border-2 border-white/15 bg-ink-800 px-3 py-2 text-sm text-white focus:border-volt-500 focus:outline-none focus:ring-0"
                                    >
                                        {Array.from({ length: 20 }, (_, i) => i + 1).map(
                                            (n) => (
                                                <option key={n} value={n}>
                                                    {n}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>

                                <p className="w-28 text-right font-display text-lg text-volt-500">
                                    {formatCentavos(line.line_total_centavos)}
                                </p>

                                <button
                                    type="button"
                                    onClick={() => remove(line.key)}
                                    className="text-xs uppercase tracking-[0.15em] text-white/30 underline underline-offset-4 transition-colors hover:text-red-400"
                                >
                                    Remove
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>

                <div className="mt-10 flex flex-col items-end gap-6">
                    <div className="flex w-full items-baseline justify-between sm:w-80">
                        <span className="font-display text-sm uppercase tracking-[0.2em] text-white/50">
                            Subtotal
                        </span>
                        <span className="font-display text-3xl text-volt-500">
                            {formatCentavos(subtotal_centavos)}
                        </span>
                    </div>

                    <p className="text-xs text-white/30">
                        Shipping is arranged with the shop after checkout.
                    </p>

                    {/* A guest can fill a cart but an order needs an owner, so
                        send them to log in with a redirect back to checkout. */}
                    <Link
                        href={auth?.user ? route('checkout.create') : route('login')}
                        className={
                            'inline-flex w-full items-center justify-center gap-3 px-8 py-4 font-display text-base uppercase tracking-[0.2em] transition-all sm:w-80 ' +
                            (blocked
                                ? 'pointer-events-none bg-white/10 text-white/30'
                                : 'bg-volt-500 text-ink-900 hover:-translate-y-0.5 hover:bg-white')
                        }
                        aria-disabled={blocked}
                    >
                        {blocked
                            ? 'Fix quantities first'
                            : auth?.user
                            ? 'Checkout →'
                            : 'Log in to checkout →'}
                    </Link>
                </div>
            </div>
        </StorefrontLayout>
    );
}
