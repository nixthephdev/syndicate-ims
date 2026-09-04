import { useMemo, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import SizeChart from '@/Components/Storefront/SizeChart';
import { formatCentavos } from '@/utils/money';

/** Unique, order-preserving. Variants arrive sorted by colour then id. */
const distinct = (values) => [...new Set(values.filter(Boolean))];

export default function ProductShow({ product }) {
    const colors = useMemo(
        () => distinct(product.variants.map((v) => v.color)),
        [product.variants]
    );

    const [color, setColor] = useState(colors[0] ?? null);

    // Sizes available in the chosen colour. Out-of-stock sizes stay visible
    // but disabled — hiding them makes the row jump as colours change and
    // leaves the shopper wondering whether the size exists at all.
    const sizes = useMemo(
        () =>
            product.variants
                .filter((v) => v.color === color)
                .map((v) => ({ size: v.size, stock: v.stock })),
        [product.variants, color]
    );

    const [size, setSize] = useState(sizes[0]?.size ?? null);

    const selected = useMemo(
        () =>
            product.variants.find(
                (v) => v.color === color && v.size === size
            ) ?? null,
        [product.variants, color, size]
    );

    const { data, setData, post, processing, transform } = useForm({
        type: 'variant',
        id: null,
        quantity: 1,
    });

    const submit = (e) => {
        e.preventDefault();

        if (!selected) return;

        // transform, not setData: setData schedules a state update, so posting
        // straight after it would send the previous variant id. transform is
        // applied to the payload at send time.
        transform((payload) => ({ ...payload, id: selected.id }));

        post(route('cart.store'), { preserveScroll: true });
    };

    const pickColor = (next) => {
        setColor(next);
        // The chosen size may not exist in the new colour; fall back to the
        // first one that does rather than leaving an impossible pairing.
        const available = product.variants.filter((v) => v.color === next);
        if (!available.some((v) => v.size === size)) {
            setSize(available[0]?.size ?? null);
        }
    };

    const outOfStock = !selected || selected.stock <= 0;

    return (
        <StorefrontLayout>
            <Head title={product.name} />

            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
                <Link
                    href={route('shop.index')}
                    className="font-display text-xs uppercase tracking-[0.25em] text-white/30 transition-colors hover:text-volt-500 light:text-ink-900/45 light:hover:text-volt-800"
                >
                    ← Shop
                </Link>

                <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
                    {/* Image */}
                    <div className="aspect-[4/5] overflow-hidden bg-ink-800 light:bg-white">
                        {product.image_path ? (
                            <img
                                src={product.image_path}
                                alt={product.name}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center bg-gradient-to-br from-ink-700 via-ink-800 to-ink-950 light:from-paper-accent light:via-paper-panel light:to-paper">
                                <span className="font-display text-3xl uppercase tracking-widest text-white/10 light:text-ink-900/10">
                                    {product.type_label ?? product.category}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Detail */}
                    <div>
                        <p className="font-display text-xs uppercase tracking-[0.35em] text-volt-500 light:text-volt-800">
                            {product.type_label ?? product.category}
                        </p>

                        <h1 className="mt-4 font-display text-[clamp(2rem,6vw,3.5rem)] uppercase leading-[0.9] tracking-tighter text-white light:text-ink-900">
                            {product.name}
                        </h1>

                        <p className="mt-6 font-display text-3xl text-volt-500 light:text-volt-800">
                            {formatCentavos(
                                selected?.price_centavos ??
                                    product.base_price_centavos
                            )}
                        </p>

                        {product.description && (
                            <p className="mt-6 text-sm leading-relaxed text-white/55 light:text-ink-900/70">
                                {product.description}
                            </p>
                        )}

                        <form onSubmit={submit} className="mt-10 space-y-8">
                            {/* Only rendered when there's an actual choice —
                                every product today has exactly one real
                                colour (image_path is one photo per product,
                                not per colour, so a picker with nothing to
                                pick was misleading). If a genuinely
                                multi-colour product is ever added via the
                                admin's variant form, this reappears on its
                                own. */}
                            {colors.length > 1 && (
                                <fieldset>
                                    <legend className="mb-3 font-display text-xs uppercase tracking-[0.25em] text-white/50 light:text-ink-900/65">
                                        Colour
                                    </legend>
                                    <div className="flex flex-wrap gap-3">
                                        {colors.map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => pickColor(c)}
                                                aria-pressed={color === c}
                                                className={
                                                    'px-5 py-2 font-display text-xs uppercase tracking-[0.2em] transition-colors ' +
                                                    (color === c
                                                        ? 'bg-volt-500 text-ink-900'
                                                        : 'border-2 border-white/15 text-white/60 hover:border-volt-500 hover:text-volt-500 light:border-ink-900/20 light:text-ink-900/70 light:hover:border-volt-800 light:hover:text-volt-800')
                                                }
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </fieldset>
                            )}

                            {sizes.length > 0 && (
                                <fieldset className="relative">
                                    <legend className="mb-3 font-display text-xs uppercase tracking-[0.25em] text-white/50 light:text-ink-900/65">
                                        Size
                                    </legend>
                                    <div className="absolute right-0 top-0">
                                        <SizeChart type={product.type} />
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {sizes.map(({ size: s, stock }) => (
                                            <button
                                                key={s}
                                                type="button"
                                                disabled={stock <= 0}
                                                onClick={() => setSize(s)}
                                                aria-pressed={size === s}
                                                title={stock <= 0 ? 'Sold out' : undefined}
                                                className={
                                                    'min-w-[3.5rem] px-4 py-2 font-display text-xs uppercase tracking-[0.2em] transition-colors ' +
                                                    (stock <= 0
                                                        ? 'cursor-not-allowed border-2 border-white/10 text-white/20 line-through light:border-ink-900/10 light:text-ink-900/30'
                                                        : size === s
                                                        ? 'bg-volt-500 text-ink-900'
                                                        : 'border-2 border-white/15 text-white/60 hover:border-volt-500 hover:text-volt-500 light:border-ink-900/20 light:text-ink-900/70 light:hover:border-volt-800 light:hover:text-volt-800')
                                                }
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </fieldset>
                            )}

                            {/* Stock line. Deliberately vague above a few units
                                — an exact count is stale the moment it renders,
                                because the cart does not reserve stock. */}
                            {selected && (
                                <p className="text-xs uppercase tracking-[0.15em] text-white/40 light:text-ink-900/55">
                                    {selected.stock <= 0
                                        ? 'Sold out'
                                        : selected.stock <= 5
                                        ? `Only ${selected.stock} left`
                                        : 'In stock'}
                                    {selected.sku && (
                                        <span className="ml-3 text-white/20 light:text-ink-900/35">
                                            {selected.sku}
                                        </span>
                                    )}
                                </p>
                            )}

                            <div className="flex flex-col gap-4 sm:flex-row">
                                <label htmlFor="quantity" className="sr-only">
                                    Quantity
                                </label>
                                <select
                                    id="quantity"
                                    value={data.quantity}
                                    onChange={(e) =>
                                        setData('quantity', Number(e.target.value))
                                    }
                                    disabled={outOfStock}
                                    className="border-2 border-white/15 bg-ink-800 px-4 py-4 font-display text-sm uppercase tracking-[0.2em] text-white focus:border-volt-500 focus:outline-none focus:ring-0 disabled:opacity-40 light:border-ink-900/20 light:bg-white light:text-ink-900 light:focus:border-volt-800 sm:w-28"
                                >
                                    {Array.from(
                                        { length: Math.min(selected?.stock ?? 1, 20) },
                                        (_, i) => i + 1
                                    ).map((n) => (
                                        <option key={n} value={n}>
                                            {n}
                                        </option>
                                    ))}
                                </select>

                                <button
                                    type="submit"
                                    disabled={outOfStock || processing}
                                    className="group inline-flex flex-1 items-center justify-center gap-3 bg-volt-500 px-8 py-4 font-display text-base uppercase tracking-[0.2em] text-ink-900 transition-all hover:-translate-y-0.5 hover:bg-white light:hover:bg-ink-900 light:hover:text-white focus:outline-none focus:ring-2 focus:ring-volt-500 focus:ring-offset-2 focus:ring-offset-ink-950 light:focus:ring-offset-paper disabled:pointer-events-none disabled:opacity-30"
                                >
                                    {outOfStock
                                        ? 'Sold out'
                                        : processing
                                        ? 'Adding'
                                        : 'Add to cart'}
                                    {!outOfStock && (
                                        <span className="transition-transform group-hover:translate-x-1">
                                            →
                                        </span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </StorefrontLayout>
    );
}
