import { useEffect, useRef, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import { formatPriceRange } from '@/utils/money';

const SORTS = [
    { value: 'newest', label: 'New drops' },
    { value: 'popularity', label: 'Most popular' },
    { value: 'price_asc', label: 'Price: low to high' },
    { value: 'price_desc', label: 'Price: high to low' },
];

function Badge({ children, tone = 'volt' }) {
    const tones = {
        volt: 'bg-volt-500 text-ink-900',
        amber: 'bg-amber-400 text-ink-900',
        ink: 'border border-white/40 text-white',
    };

    return (
        <span
            className={`px-2.5 py-1 font-display text-[10px] uppercase leading-none tracking-[0.15em] ${tones[tone]}`}
        >
            {children}
        </span>
    );
}

function ProductCard({ product, onQuickAdd, quickAddState }) {
    const href = route('shop.show', product.slug);
    const adding = quickAddState === 'adding';
    const added = quickAddState === 'added';

    return (
        <div className="group flex flex-col">
            <div className="relative aspect-[4/5] overflow-hidden border-2 border-white/10 bg-ink-800 transition-colors duration-300 group-hover:border-volt-500">
                {/* Full-image link — a separate anchor from the text link
                    below, not the quick-add button's ancestor, so the button
                    never has to fight a parent link for the click. */}
                <Link
                    href={href}
                    aria-label={`View ${product.name}`}
                    className="absolute inset-0 z-10"
                >
                    {product.image_path ? (
                        <img
                            src={product.image_path}
                            alt={product.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        />
                    ) : (
                        // No photo shoot to back every placeholder product —
                        // this falls back to the same generated block used
                        // everywhere else in the storefront rather than a
                        // fake product photo.
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-ink-700 via-ink-800 to-ink-950">
                            <span className="font-display text-2xl uppercase tracking-widest text-white/10">
                                {product.type_label ?? product.category}
                            </span>
                        </div>
                    )}
                </Link>

                {/* Badges — derived from real stock/sales data, never
                    editorial flags that don't exist in the schema. Priority:
                    sold out > limited > new, never stacked. */}
                <div className="pointer-events-none absolute left-3 top-3 z-20 flex flex-col items-start gap-1.5">
                    {product.is_sold_out ? (
                        <Badge tone="ink">Sold out</Badge>
                    ) : product.is_limited ? (
                        <Badge tone="amber">Low stock</Badge>
                    ) : product.is_new ? (
                        <Badge tone="volt">New drop</Badge>
                    ) : null}
                </div>

                {/* Quick add — a sibling of both links, not nested inside
                    either, so it needs no stopPropagation to avoid a parent
                    anchor stealing the click. Visible on hover on pointer
                    devices; visible on keyboard focus everywhere (an
                    opacity-0 button is still tabbable, so hiding it from
                    sighted keyboard users without a focus override would be
                    a real a11y bug, not a cosmetic one). */}
                {!product.is_sold_out && product.quick_add && (
                    <button
                        type="button"
                        onClick={() => onQuickAdd(product)}
                        disabled={adding}
                        className={
                            'absolute inset-x-3 bottom-3 z-30 flex items-center justify-center gap-2 border-2 py-3 font-display text-xs uppercase tracking-[0.2em] opacity-0 transition-all duration-200 focus:opacity-100 focus:outline-none sm:group-hover:opacity-100 ' +
                            (added
                                ? 'border-volt-500 bg-volt-500 text-ink-900'
                                : 'border-white/20 bg-ink-950/90 text-white backdrop-blur hover:border-volt-500 hover:bg-volt-500 hover:text-ink-900 disabled:pointer-events-none disabled:opacity-60')
                        }
                    >
                        {added ? 'Added ✓' : adding ? 'Adding…' : 'Quick add'}
                    </button>
                )}
            </div>

            <Link href={href} className="mt-4 flex items-start justify-between gap-4">
                <div>
                    <h2 className="font-display text-lg uppercase leading-tight tracking-wide text-white transition-colors group-hover:text-volt-500">
                        {product.name}
                    </h2>
                    <p className="mt-1 text-xs uppercase tracking-[0.15em] text-white/35">
                        {product.variant_count} option
                        {product.variant_count === 1 ? '' : 's'}
                    </p>
                </div>
                <p className="shrink-0 font-display text-lg text-volt-500">
                    {formatPriceRange(
                        product.price_from_centavos,
                        product.price_to_centavos
                    )}
                </p>
            </Link>
        </div>
    );
}

/** One type's worth of products, headed and grid-laid — the "segregation". */
function Section({ label, products, onQuickAdd, quickAddStates }) {
    return (
        <div>
            <div className="mb-6 flex items-baseline gap-4 border-b border-white/10 pb-4">
                <h2 className="font-display text-2xl uppercase tracking-wide text-white sm:text-3xl">
                    {label}
                </h2>
                <span className="font-display text-xs uppercase tracking-[0.2em] text-white/30">
                    {products.length}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        onQuickAdd={onQuickAdd}
                        quickAddState={quickAddStates[product.id]}
                    />
                ))}
            </div>
        </div>
    );
}

export default function ShopIndex({ sections, filters, types, typeLabels }) {
    const [term, setTerm] = useState(filters.q ?? '');
    const [quickAddStates, setQuickAddStates] = useState({});
    const debounceRef = useRef(null);

    // Any chip/search/sort change re-fetches only the catalogue data —
    // `only` keeps the rest of the page (and scroll position) untouched.
    const applyFilters = (patch) => {
        router.get(
            route('shop.index'),
            { type: filters.type, q: filters.q, sort: filters.sort, ...patch },
            { preserveState: true, preserveScroll: true, only: ['sections', 'filters'] }
        );
    };

    // Debounced search: firing a request on every keystroke would spam the
    // server and thrash the URL. 400ms is long enough to let someone type a
    // full word, short enough that the grid still feels live.
    useEffect(() => {
        if (term === (filters.q ?? '')) return;

        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            applyFilters({ q: term || undefined });
        }, 400);

        return () => clearTimeout(debounceRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [term]);

    const onQuickAdd = (product) => {
        const variantId = product.quick_add.variant_id;

        setQuickAddStates((s) => ({ ...s, [product.id]: 'adding' }));

        router.post(
            route('cart.store'),
            { type: 'variant', id: variantId, quantity: 1 },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['sections', 'flash', 'cart', 'errors'],
                onSuccess: () => {
                    setQuickAddStates((s) => ({ ...s, [product.id]: 'added' }));
                    setTimeout(() => {
                        setQuickAddStates((s) => ({ ...s, [product.id]: undefined }));
                    }, 1800);
                },
                onError: () => {
                    setQuickAddStates((s) => ({ ...s, [product.id]: undefined }));
                },
            }
        );
    };

    const chip = (active) =>
        'shrink-0 rounded-full px-5 py-2 font-display text-xs uppercase tracking-[0.2em] transition-colors ' +
        (active
            ? 'bg-volt-500 text-ink-900'
            : 'border-2 border-white/15 text-white/60 hover:border-volt-500 hover:text-volt-500');

    const totalCount = sections.reduce((n, s) => n + s.products.length, 0);

    return (
        <StorefrontLayout>
            <Head title="Shop" />

            <section className="border-b-2 border-volt-500 bg-ink-950 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <p className="flex items-center gap-3 font-display text-xs uppercase tracking-[0.35em] text-volt-500">
                        <span className="h-px w-8 bg-volt-500" />
                        Everything in stock
                    </p>
                    <h1 className="mt-5 font-display text-[clamp(2.5rem,9vw,6rem)] uppercase leading-[0.85] tracking-tighter text-white">
                        The shop
                    </h1>
                </div>
            </section>

            <section className="bg-ink-950 px-4 py-12 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    {/* Utility bar: pill filters left, search + sort right.
                        Wraps to its own row on mobile rather than squeezing
                        everything into one line. */}
                    <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0 lg:pb-0">
                            <button
                                type="button"
                                onClick={() => applyFilters({ type: undefined })}
                                className={chip(!filters.type)}
                            >
                                All
                            </button>
                            {types.map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => applyFilters({ type })}
                                    className={chip(filters.type === type)}
                                >
                                    {typeLabels[type] ?? type}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="relative">
                                <svg
                                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="2"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                                    />
                                </svg>
                                <label htmlFor="shop-search" className="sr-only">
                                    Search products
                                </label>
                                <input
                                    id="shop-search"
                                    type="search"
                                    value={term}
                                    onChange={(e) => setTerm(e.target.value)}
                                    placeholder="Search the shop…"
                                    className="w-full border-2 border-white/15 bg-ink-800 py-2.5 pl-9 pr-4 text-sm text-white placeholder-white/30 transition-colors focus:border-volt-500 focus:outline-none focus:ring-0 sm:w-56"
                                />
                            </div>

                            <label htmlFor="shop-sort" className="sr-only">
                                Sort by
                            </label>
                            <select
                                id="shop-sort"
                                value={filters.sort}
                                onChange={(e) => applyFilters({ sort: e.target.value })}
                                className="border-2 border-white/15 bg-ink-800 py-2.5 pl-4 pr-9 font-display text-xs uppercase tracking-[0.15em] text-white transition-colors focus:border-volt-500 focus:outline-none focus:ring-0"
                            >
                                {SORTS.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {totalCount === 0 ? (
                        <p className="py-20 text-center font-display text-xl uppercase tracking-[0.2em] text-white/30">
                            {filters.q ? `Nothing matches "${filters.q}."` : 'Nothing here yet.'}
                        </p>
                    ) : (
                        <div className="space-y-20">
                            {sections.map((section) => (
                                <Section
                                    key={section.type}
                                    label={section.label}
                                    products={section.products}
                                    onQuickAdd={onQuickAdd}
                                    quickAddStates={quickAddStates}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </StorefrontLayout>
    );
}
