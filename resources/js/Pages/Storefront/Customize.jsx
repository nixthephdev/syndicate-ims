import { useMemo, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Loader } from '@react-three/drei';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import Scene from '@/Components/Customizer/Scene';
import PartPicker from '@/Components/Customizer/PartPicker';
import ColorSwatchPicker from '@/Components/Customizer/ColorSwatchPicker';
import { DEFAULT_HARDWARE_COLOR } from '@/Components/Customizer/hardwareColors';
import { formatCentavos } from '@/utils/money';
import { useTheme } from '@/utils/useTheme';

export default function Customize({ decks, wheels, trucks, bolts }) {
    // The builder opens EMPTY — no deck, no wheels, nothing preselected.
    // It used to default to the first in-stock option of each, which quietly
    // put someone else's graphic on the board before the shopper had chosen
    // anything and made the running total look like a real price. Starting
    // from nothing is what makes this read as a build rather than a preset.
    // Board.jsx/Wheels.jsx already hide everything on a null selection.
    const [deckId, setDeckId] = useState(null);
    const [wheelsId, setWheelsId] = useState(null);

    // Free cosmetic recolour of the fixed Bolts/Trucks hardware — see
    // hardwareColors.js. Never affects totalCentavos or the cart payload:
    // there is no separate SKU behind a colour, unlike Deck/Wheels.
    const [boltsColor, setBoltsColor] = useState(DEFAULT_HARDWARE_COLOR);
    const [trucksColor, setTrucksColor] = useState(DEFAULT_HARDWARE_COLOR);

    // drei's <Loader> renders inline style props on a DOM overlay outside the
    // R3F tree — Tailwind's `light:` variant can't reach it, so it needs the
    // theme read directly. Also keeps it in sync if the toggle is flipped
    // while this page is already mounted (see utils/useTheme.js).
    const { theme } = useTheme();
    const isLight = theme === 'light';

    const selectedDeck = useMemo(
        () => decks.find((d) => d.id === deckId) ?? null,
        [decks, deckId]
    );
    const selectedWheels = useMemo(
        () => wheels.find((w) => w.id === wheelsId) ?? null,
        [wheels, wheelsId]
    );

    const buildStarted = Boolean(selectedDeck || selectedWheels);

    // Trucks and bolts are in every build, but they only join the total once
    // the shopper has actually picked something — otherwise a page nobody has
    // touched yet opens showing a real-looking price for parts they never
    // chose. Nothing selected reads as zero, which is the truth.
    const totalCentavos = buildStarted
        ? (selectedDeck?.price_centavos ?? 0) +
          (selectedWheels?.price_centavos ?? 0) +
          (trucks?.price_centavos ?? 0) +
          (bolts?.price_centavos ?? 0)
        : 0;

    const { post, processing, transform } = useForm({
        deck_id: null,
        wheels_id: null,
    });

    // Two genuinely different reasons the button can't be pressed, kept
    // apart so the label can say which. They used to be one flag, which
    // meant an untouched page greeted everyone with "Sold out".
    const isIncomplete = !selectedDeck || !selectedWheels;

    const soldOut =
        selectedDeck?.is_out_of_stock ||
        selectedWheels?.is_out_of_stock ||
        (trucks && trucks.is_out_of_stock) ||
        (bolts && bolts.is_out_of_stock);

    const canAdd = !isIncomplete && !soldOut;

    const submit = (e) => {
        e.preventDefault();

        if (!canAdd) return;

        transform(() => ({ deck_id: deckId, wheels_id: wheelsId }));
        post(route('customize.store'), { preserveScroll: true });
    };

    return (
        <StorefrontLayout>
            <Head title="Build your board" />
            <Loader
                containerStyles={{
                    background: isLight ? 'rgba(247,246,242,0.9)' : 'rgba(5,5,5,0.9)',
                }}
                innerStyles={{ width: '200px' }}
                barStyles={{ background: '#ccff00' }}
                dataStyles={{
                    fontFamily: 'inherit',
                    fontSize: '11px',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: isLight ? '#0b0b0b' : '#fff',
                }}
            />

            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
                <Link
                    href={route('shop.index')}
                    className="font-display text-xs uppercase tracking-[0.25em] text-white/30 transition-colors hover:text-volt-500 light:text-ink-900/45 light:hover:text-volt-800"
                >
                    ← Shop
                </Link>

                <p className="mt-6 flex items-center gap-3 font-display text-xs uppercase tracking-[0.35em] text-volt-500 light:text-volt-800">
                    <span className="h-px w-8 bg-volt-500" />
                    Build your own
                </p>
                <h1 className="mt-4 font-display text-[clamp(2rem,6vw,3.5rem)] uppercase leading-[0.9] tracking-tighter text-white light:text-ink-900">
                    Custom board
                </h1>

                <div className="mt-10 grid gap-10 lg:grid-cols-5 lg:gap-12">
                    {/* 3D preview */}
                    <div className="lg:col-span-3">
                        <div className="h-[50vh] border-2 border-white/10 light:border-ink-900/10 lg:h-[70vh]">
                            <Scene
                                deckMeshName={selectedDeck?.mesh_name}
                                wheelsMeshName={selectedWheels?.mesh_name}
                                boltsColor={boltsColor}
                                trucksColor={trucksColor}
                            />
                        </div>
                        <p className="mt-3 text-xs uppercase tracking-[0.15em] text-white/30 light:text-ink-900/45">
                            Drag to rotate · scroll to zoom
                        </p>

                        {(trucks || bolts) && (
                            <div className="mt-8 space-y-8">
                                {trucks && (
                                    <ColorSwatchPicker
                                        label={`${trucks.name} colour`}
                                        value={trucksColor}
                                        onChange={setTrucksColor}
                                    />
                                )}

                                {bolts && (
                                    <ColorSwatchPicker
                                        label={`${bolts.name} colour`}
                                        value={boltsColor}
                                        onChange={setBoltsColor}
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Pickers + summary */}
                    <form onSubmit={submit} className="space-y-8 lg:col-span-2">
                        <PartPicker
                            label="Deck"
                            options={decks}
                            selectedId={deckId}
                            onSelect={setDeckId}
                        />

                        <PartPicker
                            label="Wheels"
                            options={wheels}
                            selectedId={wheelsId}
                            onSelect={setWheelsId}
                        />

                        <div className="border-t border-white/10 pt-6 light:border-ink-900/10">
                            <div className="flex items-baseline justify-between">
                                <span className="font-display text-sm uppercase tracking-[0.2em] text-white/50 light:text-ink-900/65">
                                    Total
                                </span>
                                <span className="font-display text-3xl text-volt-500 light:text-volt-800">
                                    {formatCentavos(totalCentavos)}
                                </span>
                            </div>

                            <button
                                type="submit"
                                disabled={!canAdd || processing}
                                className="group mt-6 inline-flex w-full items-center justify-center gap-3 bg-volt-500 px-8 py-4 font-display text-base uppercase tracking-[0.2em] text-ink-900 transition-all hover:-translate-y-0.5 hover:bg-white light:hover:bg-ink-900 light:hover:text-white focus:outline-none focus:ring-2 focus:ring-volt-500 focus:ring-offset-2 focus:ring-offset-ink-950 light:focus:ring-offset-paper disabled:pointer-events-none disabled:opacity-30"
                            >
                                {soldOut
                                    ? 'Sold out'
                                    : isIncomplete
                                    ? !selectedDeck && !selectedWheels
                                        ? 'Pick a deck and wheels'
                                        : !selectedDeck
                                        ? 'Pick a deck'
                                        : 'Pick your wheels'
                                    : processing
                                    ? 'Adding'
                                    : 'Add build to cart'}
                                {canAdd && (
                                    <span className="transition-transform group-hover:translate-x-1">
                                        →
                                    </span>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

            </div>
        </StorefrontLayout>
    );
}
