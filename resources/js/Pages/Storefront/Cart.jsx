import { Head, Link, router, usePage } from '@inertiajs/react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import { HARDWARE_COLORS } from '@/Components/Customizer/hardwareColors';
import { formatCentavos } from '@/utils/money';

/** Icon-only remove button — same Heroicons-outline convention already used
 *  for ToastStack's dismiss × and StoreHeader's cart/menu icons (hand-copied
 *  paths, no icon library dependency). A bare underlined "Remove" read as an
 *  odd one out next to the other controls on this row; a trash icon reads
 *  instantly and matches everything else here being iconography, not text. */
function RemoveButton({ onClick, label }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            className="shrink-0 p-2 text-white/30 transition-colors hover:text-red-400 light:text-ink-900/40 light:hover:text-red-700"
        >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
            </svg>
        </button>
    );
}

/** A /parts hardware line's colour swatch + label — reuses the one real
 *  colour list (Components/Customizer/hardwareColors.js) rather than
 *  re-deriving labels from a raw hex. Falls back to the hex itself if it
 *  somehow doesn't match (shouldn't happen — AddToCartRequest only accepts
 *  hex-shaped strings, not specifically these 11, so this stays defensive). */
function ColorNote({ hex }) {
    const swatch = HARDWARE_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase());

    return (
        <p className="mt-2 flex items-center gap-2 text-xs text-white/50 light:text-ink-900/60">
            <span
                className="h-3 w-3 shrink-0 rounded-full border border-white/20 light:border-ink-900/20"
                style={{ backgroundColor: hex }}
            />
            {swatch?.label ?? hex} colour requested
        </p>
    );
}

/**
 * Lines added together as one /customize build share a build_key (see
 * App\Services\Cart::add()). Bucket those into one group per key, in the
 * cart, preserving first-seen order — everything else (all apparel) stays
 * one row per line, exactly as before.
 */
function groupLines(lines) {
    const rows = [];
    const groupIndex = new Map();

    for (const line of lines) {
        if (!line.build_key) {
            rows.push({ kind: 'line', line });
            continue;
        }

        if (groupIndex.has(line.build_key)) {
            rows[groupIndex.get(line.build_key)].lines.push(line);
        } else {
            groupIndex.set(line.build_key, rows.length);
            rows.push({ kind: 'build', buildKey: line.build_key, lines: [line] });
        }
    }

    return rows;
}

export default function Cart({ lines, subtotal_centavos }) {
    const { auth } = usePage().props;

    const setQuantity = (keys, quantity) => {
        router.patch(
            route('cart.update'),
            Array.isArray(keys) ? { keys, quantity } : { key: keys, quantity },
            { preserveScroll: true }
        );
    };

    const remove = (keys) => {
        router.delete(route('cart.destroy'), {
            data: Array.isArray(keys) ? { keys } : { key: keys },
            preserveScroll: true,
        });
    };

    const blocked = lines.some((line) => line.exceeds_stock);
    const rows = groupLines(lines);

    if (lines.length === 0) {
        return (
            <StorefrontLayout>
                <Head title="Cart" />
                <div className="mx-auto max-w-3xl px-4 py-28 text-center sm:px-6">
                    <h1 className="font-display text-[clamp(2rem,7vw,4rem)] uppercase leading-[0.9] tracking-tighter text-white light:text-ink-900">
                        Your cart is
                        <br />
                        <span className="text-volt-500 light:text-volt-800">empty.</span>
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
                <h1 className="font-display text-[clamp(2rem,7vw,4rem)] uppercase leading-[0.9] tracking-tighter text-white light:text-ink-900">
                    Your cart
                </h1>

                <ul className="mt-12 divide-y divide-white/10 border-y border-white/10 light:divide-ink-900/10 light:border-ink-900/10">
                    {rows.map((row) => {
                        if (row.kind === 'line') {
                            const line = row.line;

                            return (
                                <li
                                    key={line.key}
                                    className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="min-w-0">
                                        <p className="font-display text-lg uppercase tracking-wide text-white light:text-ink-900">
                                            {line.name}
                                        </p>
                                        <p className="mt-1 text-xs uppercase tracking-[0.15em] text-white/35 light:text-ink-900/50">
                                            {formatCentavos(line.unit_price_centavos)} each
                                        </p>
                                        {line.color && <ColorNote hex={line.color} />}
                                        {line.exceeds_stock && (
                                            <p className="mt-2 text-xs font-medium text-red-400 light:text-red-700">
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
                                                className="border-2 border-white/15 bg-ink-800 px-3 py-2 text-sm text-white focus:border-volt-500 focus:outline-none focus:ring-0 light:border-ink-900/20 light:bg-white light:text-ink-900 light:focus:border-volt-800"
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

                                        <p className="w-28 text-right font-display text-lg text-volt-500 light:text-volt-800">
                                            {formatCentavos(line.line_total_centavos)}
                                        </p>

                                        <RemoveButton
                                            onClick={() => remove(line.key)}
                                            label={`Remove ${line.name} from cart`}
                                        />
                                    </div>
                                </li>
                            );
                        }

                        // A custom board: deck+wheels(+trucks+bolts) added
                        // together on /customize, shown as one entry. Every
                        // member line normally shares one quantity (they're
                        // always added in lockstep) — the stepper here sets
                        // that same value on all of them in one request.
                        const keys = row.lines.map((l) => l.key);
                        const groupTotal = row.lines.reduce((sum, l) => sum + l.line_total_centavos, 0);
                        const groupQuantity = row.lines[0].quantity;
                        const groupExceedsStock = row.lines.some((l) => l.exceeds_stock);

                        return (
                            <li
                                key={row.buildKey}
                                className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0">
                                    <p className="font-display text-lg uppercase tracking-wide text-white light:text-ink-900">
                                        Custom Board
                                    </p>
                                    <p className="mt-1 text-xs uppercase tracking-[0.15em] text-white/35 light:text-ink-900/50">
                                        {row.lines.map((l) => l.name).join(' · ')}
                                    </p>
                                    {groupExceedsStock && (
                                        <p className="mt-2 text-xs font-medium text-red-400 light:text-red-700">
                                            One of these parts is short on stock — reduce
                                            the quantity to continue.
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-6">
                                    <div>
                                        <label htmlFor={`qty-${row.buildKey}`} className="sr-only">
                                            Quantity for Custom Board
                                        </label>
                                        <select
                                            id={`qty-${row.buildKey}`}
                                            value={groupQuantity}
                                            onChange={(e) => setQuantity(keys, Number(e.target.value))}
                                            className="border-2 border-white/15 bg-ink-800 px-3 py-2 text-sm text-white focus:border-volt-500 focus:outline-none focus:ring-0 light:border-ink-900/20 light:bg-white light:text-ink-900 light:focus:border-volt-800"
                                        >
                                            {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                                                <option key={n} value={n}>
                                                    {n}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <p className="w-28 text-right font-display text-lg text-volt-500 light:text-volt-800">
                                        {formatCentavos(groupTotal)}
                                    </p>

                                    <RemoveButton
                                        onClick={() => remove(keys)}
                                        label="Remove custom board from cart"
                                    />
                                </div>
                            </li>
                        );
                    })}
                </ul>

                <div className="mt-10 flex flex-col items-end gap-6">
                    <div className="flex w-full items-baseline justify-between sm:w-80">
                        <span className="font-display text-sm uppercase tracking-[0.2em] text-white/50 light:text-ink-900/65">
                            Subtotal
                        </span>
                        <span className="font-display text-3xl text-volt-500 light:text-volt-800">
                            {formatCentavos(subtotal_centavos)}
                        </span>
                    </div>

                    <p className="text-xs text-white/30 light:text-ink-900/45">
                        Shipping is arranged with the shop after checkout.
                    </p>

                    {/* A guest can fill a cart but an order needs an owner, so
                        send them to log in with a redirect back to checkout.
                        The "blocked" state is a neutral chip (alpha-boost
                        pairing), not the invariant-fill button below it. */}
                    <Link
                        href={auth?.user ? route('checkout.create') : route('login')}
                        className={
                            'inline-flex w-full items-center justify-center gap-3 px-8 py-4 font-display text-base uppercase tracking-[0.2em] transition-all sm:w-80 ' +
                            (blocked
                                ? 'pointer-events-none bg-white/10 text-white/30 light:bg-ink-900/[0.06] light:text-ink-900/40'
                                : 'bg-volt-500 text-ink-900 hover:-translate-y-0.5 hover:bg-white light:hover:bg-ink-900 light:hover:text-white')
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
