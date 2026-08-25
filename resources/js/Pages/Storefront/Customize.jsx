import { useMemo, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Loader } from '@react-three/drei';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import Scene from '@/Components/Customizer/Scene';
import PartPicker from '@/Components/Customizer/PartPicker';
import { formatCentavos } from '@/utils/money';

const firstAvailable = (options) =>
    options.find((o) => !o.is_out_of_stock)?.id ?? options[0]?.id ?? null;

export default function Customize({ decks, wheels, trucks, bolts }) {
    const [deckId, setDeckId] = useState(() => firstAvailable(decks));
    const [wheelsId, setWheelsId] = useState(() => firstAvailable(wheels));

    const selectedDeck = useMemo(
        () => decks.find((d) => d.id === deckId) ?? null,
        [decks, deckId]
    );
    const selectedWheels = useMemo(
        () => wheels.find((w) => w.id === wheelsId) ?? null,
        [wheels, wheelsId]
    );

    const totalCentavos =
        (selectedDeck?.price_centavos ?? 0) +
        (selectedWheels?.price_centavos ?? 0) +
        (trucks?.price_centavos ?? 0) +
        (bolts?.price_centavos ?? 0);

    const { post, processing, transform } = useForm({
        deck_id: null,
        wheels_id: null,
    });

    const outOfStock =
        !selectedDeck ||
        !selectedWheels ||
        selectedDeck.is_out_of_stock ||
        selectedWheels.is_out_of_stock ||
        (trucks && trucks.is_out_of_stock) ||
        (bolts && bolts.is_out_of_stock);

    const submit = (e) => {
        e.preventDefault();

        if (outOfStock) return;

        transform(() => ({ deck_id: deckId, wheels_id: wheelsId }));
        post(route('customize.store'), { preserveScroll: true });
    };

    return (
        <StorefrontLayout>
            <Head title="Build your board" />
            <Loader
                containerStyles={{ background: 'rgba(5,5,5,0.9)' }}
                innerStyles={{ width: '200px' }}
                barStyles={{ background: '#ccff00' }}
                dataStyles={{
                    fontFamily: 'inherit',
                    fontSize: '11px',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: '#fff',
                }}
            />

            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
                <Link
                    href={route('shop.index')}
                    className="font-display text-xs uppercase tracking-[0.25em] text-white/30 transition-colors hover:text-volt-500"
                >
                    ← Shop
                </Link>

                <p className="mt-6 flex items-center gap-3 font-display text-xs uppercase tracking-[0.35em] text-volt-500">
                    <span className="h-px w-8 bg-volt-500" />
                    Build your own
                </p>
                <h1 className="mt-4 font-display text-[clamp(2rem,6vw,3.5rem)] uppercase leading-[0.9] tracking-tighter text-white">
                    Custom board
                </h1>

                <div className="mt-10 grid gap-10 lg:grid-cols-5 lg:gap-12">
                    {/* 3D preview */}
                    <div className="lg:col-span-3">
                        <div className="h-[50vh] border-2 border-white/10 lg:h-[70vh]">
                            <Scene
                                deckMeshName={selectedDeck?.mesh_name}
                                wheelsMeshName={selectedWheels?.mesh_name}
                            />
                        </div>
                        <p className="mt-3 text-xs uppercase tracking-[0.15em] text-white/30">
                            Drag to rotate · scroll to zoom
                        </p>
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

                        {(trucks || bolts) && (
                            <div>
                                <p className="mb-3 font-display text-xs uppercase tracking-[0.25em] text-white/50">
                                    Included
                                </p>
                                <ul className="space-y-1 text-sm text-white/50">
                                    {trucks && <li>{trucks.name}</li>}
                                    {bolts && <li>{bolts.name}</li>}
                                </ul>
                            </div>
                        )}

                        <div className="border-t border-white/10 pt-6">
                            <div className="flex items-baseline justify-between">
                                <span className="font-display text-sm uppercase tracking-[0.2em] text-white/50">
                                    Total
                                </span>
                                <span className="font-display text-3xl text-volt-500">
                                    {formatCentavos(totalCentavos)}
                                </span>
                            </div>

                            <button
                                type="submit"
                                disabled={outOfStock || processing}
                                className="group mt-6 inline-flex w-full items-center justify-center gap-3 bg-volt-500 px-8 py-4 font-display text-base uppercase tracking-[0.2em] text-ink-900 transition-all hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-volt-500 focus:ring-offset-2 focus:ring-offset-ink-950 disabled:pointer-events-none disabled:opacity-30"
                            >
                                {outOfStock
                                    ? 'Sold out'
                                    : processing
                                    ? 'Adding'
                                    : 'Add build to cart'}
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
        </StorefrontLayout>
    );
}
