import { Head, Link, router } from '@inertiajs/react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import { formatPriceRange } from '@/utils/money';

function ProductCard({ product }) {
    const soldOut = product.total_stock <= 0;

    return (
        <Link href={route('shop.show', product.slug)} className="group block">
            <div className="relative aspect-[4/5] overflow-hidden bg-ink-800">
                {product.image_path ? (
                    <img
                        src={product.image_path}
                        alt={product.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                ) : (
                    // Placeholder catalogue depth — no photo shoot to back it
                    // yet, so this falls back to the same generated block
                    // LookbookTile uses rather than a fake product photo.
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-ink-700 via-ink-800 to-ink-950">
                        <span className="font-display text-2xl uppercase tracking-widest text-white/10">
                            {product.type_label ?? product.category}
                        </span>
                    </div>
                )}

                {soldOut && (
                    <div className="absolute inset-0 flex items-center justify-center bg-ink-950/70">
                        <span className="border-2 border-white px-4 py-2 font-display text-sm uppercase tracking-[0.2em] text-white">
                            Sold out
                        </span>
                    </div>
                )}
            </div>

            <div className="mt-4 flex items-start justify-between gap-4">
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
            </div>
        </Link>
    );
}

/** One type's worth of products, headed and grid-laid — the "segregation". */
function Section({ label, products }) {
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

            <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    );
}

export default function ShopIndex({ sections, filters, types, typeLabels }) {
    // Inertia visit rather than a Link per chip: `only` re-fetches just the
    // sections, leaving the rest of the page (and scroll position) alone.
    const filterBy = (type) => {
        router.get(
            route('shop.index'),
            type ? { type } : {},
            { preserveState: true, preserveScroll: true, only: ['sections', 'filters'] }
        );
    };

    const chip = (active) =>
        'px-5 py-2 font-display text-xs uppercase tracking-[0.2em] transition-colors ' +
        (active
            ? 'bg-volt-500 text-ink-900'
            : 'border-2 border-white/15 text-white/60 hover:border-volt-500 hover:text-volt-500');

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
                    <div className="mb-14 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => filterBy(null)}
                            className={chip(!filters.type)}
                        >
                            All
                        </button>
                        {types.map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => filterBy(type)}
                                className={chip(filters.type === type)}
                            >
                                {typeLabels[type] ?? type}
                            </button>
                        ))}
                    </div>

                    {sections.length === 0 ? (
                        <p className="py-20 text-center font-display text-xl uppercase tracking-[0.2em] text-white/30">
                            Nothing here yet.
                        </p>
                    ) : (
                        <div className="space-y-20">
                            {sections.map((section) => (
                                <Section
                                    key={section.type}
                                    label={section.label}
                                    products={section.products}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </StorefrontLayout>
    );
}
