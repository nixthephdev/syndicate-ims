import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import ColorSwatchPicker from '@/Components/Customizer/ColorSwatchPicker';
import { DEFAULT_HARDWARE_COLOR } from '@/Components/Customizer/hardwareColors';
import { formatCentavos } from '@/utils/money';

/** `board-{mesh_name}-{hex}.png` — the exact naming PartController's
 *  regeneration doc (public/images/parts/README.md) and the offline capture
 *  script use. Computed client-side off the one real colour list in
 *  Components/Customizer/hardwareColors.js rather than duplicating it as a
 *  second PHP constant that could drift. */
function hardwareImage(meshName, hex) {
    return `/images/parts/board-${meshName}-${hex.replace('#', '').toLowerCase()}.png`;
}

/** Stock-state chip — sold out / low stock only. No "New drop"/"Limited"
 *  marketing badges here on purpose; this page is about buyability, not
 *  merchandising (see the plan this page shipped from). */
function StockChip({ isOutOfStock, isLowStock }) {
    if (isOutOfStock) {
        return (
            <span className="px-2.5 py-1 font-display text-[10px] uppercase leading-none tracking-[0.15em] border border-white/40 text-white">
                Sold out
            </span>
        );
    }

    if (isLowStock) {
        return (
            <span className="px-2.5 py-1 font-display text-[10px] uppercase leading-none tracking-[0.15em] bg-amber-400 text-ink-900">
                Low stock
            </span>
        );
    }

    return null;
}

function AddToCartButton({ part, state, onAdd, color }) {
    const adding = state === 'adding';
    const added = state === 'added';

    return (
        <button
            type="button"
            onClick={() => onAdd(part, color)}
            disabled={part.is_out_of_stock || adding}
            className={
                'mt-3 flex w-full items-center justify-center gap-2 border-2 py-3 font-display text-xs uppercase tracking-[0.2em] transition-all disabled:pointer-events-none disabled:opacity-40 ' +
                (added
                    ? 'border-volt-500 bg-volt-500 text-ink-900'
                    : 'border-white/20 bg-transparent text-white hover:border-volt-500 hover:bg-volt-500 hover:text-ink-900 light:border-ink-900/20 light:text-ink-900 light:hover:border-volt-800 light:hover:bg-volt-800 light:hover:text-white')
            }
        >
            {part.is_out_of_stock ? 'Sold out' : added ? 'Added ✓' : adding ? 'Adding…' : 'Add to cart'}
        </button>
    );
}

/** Card body shared by the Deck/Wheels grid and the Hardware strip — same
 *  shape either way, just a different container/grid around it. Parts have
 *  no product photography (they're 3D-modelled, not shot) — the image,
 *  when present, is a real render of the actual baked mesh graphic (see
 *  PartController::imageUrl), not a photo. A missing render still falls
 *  back to the generated placeholder block the apparel grid uses too —
 *  never a fake product photo either way.
 *
 *  Trucks/Bolts (`part.has_color_variants`) get a colour swatch row instead
 *  of a single fixed image — same free cosmetic recolour /customize already
 *  does (see ColorSwatchPicker), just pre-rendered per colour here since
 *  this page has no live 3D viewer to recolour in real time. It's a
 *  PREVIEW, not a real order option — nothing about the choice is sent with
 *  Add to Cart (there is only ever the one SKU/stock row) — so the caption
 *  below the swatches says so explicitly rather than leaving a buyer to
 *  assume their pick ships. */
function PartCard({ part, state, onAdd, selectedColor, onColorChange }) {
    const image = part.has_color_variants
        ? hardwareImage(part.mesh_name, selectedColor ?? DEFAULT_HARDWARE_COLOR)
        : part.image;

    return (
        <div className="flex flex-col">
            <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden border-2 border-white/10 bg-gradient-to-br from-ink-700 via-ink-800 to-ink-950 light:border-ink-900/10 light:from-paper-accent light:via-paper-panel light:to-paper">
                {image ? (
                    <img
                        src={image}
                        alt={part.name}
                        className="h-full w-full object-contain p-4"
                        loading="lazy"
                    />
                ) : (
                    <span className="font-display text-2xl uppercase tracking-widest text-white/10 light:text-ink-900/10">
                        {part.type_label}
                    </span>
                )}

                {(part.is_out_of_stock || part.is_low_stock) && (
                    <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
                        <StockChip isOutOfStock={part.is_out_of_stock} isLowStock={part.is_low_stock} />
                    </div>
                )}
            </div>

            <div className="mt-4 flex items-start justify-between gap-4">
                <h3 className="font-display text-lg uppercase leading-tight tracking-wide text-white light:text-ink-900">
                    {part.name}
                </h3>
                <p className="shrink-0 font-display text-lg text-volt-500 light:text-volt-800">
                    {formatCentavos(part.price_centavos)}
                </p>
            </div>

            {part.has_color_variants && (
                <div className="mt-4">
                    <ColorSwatchPicker
                        label="Colour"
                        value={selectedColor ?? DEFAULT_HARDWARE_COLOR}
                        onChange={onColorChange}
                    />
                    <p className="mt-2 text-[11px] text-white/35 light:text-ink-900/45">
                        We'll note this colour on your order and try to match
                        it — it isn't a guaranteed stock option.
                    </p>
                </div>
            )}

            <AddToCartButton
                part={part}
                state={state}
                onAdd={onAdd}
                color={part.has_color_variants ? selectedColor ?? DEFAULT_HARDWARE_COLOR : null}
            />
        </div>
    );
}

export default function PartsIndex({ decks, wheels, trucks, bolts }) {
    const [addStates, setAddStates] = useState({});
    const [colorByPartId, setColorByPartId] = useState({});

    const onAdd = (part, color) => {
        setAddStates((s) => ({ ...s, [part.id]: 'adding' }));

        router.post(
            route('cart.store'),
            { type: 'component', id: part.id, quantity: 1, color: color ?? undefined },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['flash', 'cart', 'errors'],
                onSuccess: () => {
                    setAddStates((s) => ({ ...s, [part.id]: 'added' }));
                    setTimeout(() => {
                        setAddStates((s) => ({ ...s, [part.id]: undefined }));
                    }, 1800);
                },
                onError: () => {
                    setAddStates((s) => ({ ...s, [part.id]: undefined }));
                },
            }
        );
    };

    const hardware = [trucks, bolts].filter(Boolean);

    return (
        <StorefrontLayout>
            <Head title="Parts" />

            <section className="border-b-2 border-volt-500 bg-ink-950 light:bg-paper px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <p className="flex items-center gap-3 font-display text-xs uppercase tracking-[0.35em] text-volt-500 light:text-volt-800">
                        <span className="h-px w-8 bg-volt-500" />
                        Buy them separately
                    </p>
                    <h1 className="mt-5 font-display text-[clamp(2.5rem,9vw,6rem)] uppercase leading-[0.85] tracking-tighter text-white light:text-ink-900">
                        Parts
                    </h1>
                    <p className="mt-5 max-w-xl text-sm text-white/50 light:text-ink-900/60">
                        Need just a new deck, or a fresh set of wheels? Buy any piece on its own — or head to{' '}
                        <Link href={route('customize')} className="text-volt-500 underline underline-offset-4 light:text-volt-800">
                            Customize
                        </Link>{' '}
                        to build a complete board.
                    </p>
                </div>
            </section>

            <section className="bg-ink-950 light:bg-paper px-4 py-12 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl space-y-20">
                    <div>
                        <div className="mb-6 flex items-baseline gap-4 border-b border-white/10 pb-4 light:border-ink-900/10">
                            <h2 className="font-display text-2xl uppercase tracking-wide text-white light:text-ink-900 sm:text-3xl">
                                Decks
                            </h2>
                            <span className="font-display text-xs uppercase tracking-[0.2em] text-white/30 light:text-ink-900/45">
                                {decks.length}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
                            {decks.map((deck) => (
                                <PartCard key={deck.id} part={deck} state={addStates[deck.id]} onAdd={onAdd} />
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="mb-6 flex items-baseline gap-4 border-b border-white/10 pb-4 light:border-ink-900/10">
                            <h2 className="font-display text-2xl uppercase tracking-wide text-white light:text-ink-900 sm:text-3xl">
                                Wheels
                            </h2>
                            <span className="font-display text-xs uppercase tracking-[0.2em] text-white/30 light:text-ink-900/45">
                                {wheels.length}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
                            {wheels.map((w) => (
                                <PartCard key={w.id} part={w} state={addStates[w.id]} onAdd={onAdd} />
                            ))}
                        </div>
                    </div>

                    {/* Trucks/bolts are singletons — see PartController — so
                        they get a small fixed strip, not a grid "section"
                        that would look like an empty/broken one. */}
                    {hardware.length > 0 && (
                        <div>
                            <div className="mb-6 flex items-baseline gap-4 border-b border-white/10 pb-4 light:border-ink-900/10">
                                <h2 className="font-display text-2xl uppercase tracking-wide text-white light:text-ink-900 sm:text-3xl">
                                    Hardware
                                </h2>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 max-w-md">
                                {hardware.map((part) => (
                                    <PartCard
                                        key={part.id}
                                        part={part}
                                        state={addStates[part.id]}
                                        onAdd={onAdd}
                                        selectedColor={colorByPartId[part.id]}
                                        onColorChange={(hex) =>
                                            setColorByPartId((s) => ({ ...s, [part.id]: hex }))
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </StorefrontLayout>
    );
}
