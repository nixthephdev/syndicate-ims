import { Head, Link } from '@inertiajs/react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import Marquee from '@/Components/Storefront/Marquee';
import LookbookGrid from '@/Components/Storefront/LookbookGrid';
import HeroBoard from '@/Components/Storefront/HeroBoard';

/**
 * The client's own photography, off the shop's Facebook page.
 *
 * Sources live in public/files/images/lookbook-src/ and are processed by
 * `php tools/lookbook.php`, which resizes to 1000px, strips EXIF (phone
 * photos carry the shop's GPS coordinates) and reports each `ratio`. Do not
 * hand-edit `src` or `ratio` — re-run the script.
 *
 * Order is deliberate: the CSS-column masonry fills top-to-bottom per column,
 * so tall/wide/square are interleaved to keep the columns uneven. Reordering
 * these will change how the grid staggers.
 */
const LOOKBOOK = [
    {
        src: '/images/lookbook/storefront.jpg',
        alt: 'Two customers standing in the doorway of the Syndicate Supply Co. shop, under the shop sign',
        tag: 'The shop',
        caption: 'Through the front door',
        ratio: 'aspect-[2/3]',
    },
    {
        src: '/images/lookbook/skater-night-court.jpg',
        alt: 'Skater mid-trick under floodlights on an outdoor court at night, board flipping beneath them',
        tag: 'Street',
        caption: 'Night session on the court',
        ratio: 'aspect-[3/2]',
    },
    {
        src: '/images/lookbook/mint-tee-rocks.jpg',
        alt: 'Person in an oversized mint Syndicate tee and sunglasses, leaning against a rock face',
        tag: 'Apparel',
        caption: 'Oversized tee — mint',
        ratio: 'aspect-[2/3]',
    },
    {
        src: '/images/lookbook/varsity-hoodie.jpg',
        alt: 'Red and black varsity zip hoodie with the Syndicate brain logo, laid flat on concrete',
        tag: 'Hoodies',
        caption: 'Varsity zip hoodie — red',
        ratio: 'aspect-[2/3]',
    },
    {
        src: '/images/lookbook/love-your-mind-tee.jpg',
        alt: 'Front and back of a white tee with a pink Love Your Mind graphic',
        tag: 'New drop',
        caption: 'Love Your Mind — front & back',
        ratio: 'aspect-[1/1]',
    },
    {
        src: '/images/lookbook/syndicate-cap-white-tee.jpg',
        alt: 'Person in a white Syndicate graphic tee and embroidered cap outdoors, a friend resting in a hammock behind them',
        tag: 'Apparel',
        caption: 'Peace by Plant tee + cap',
        ratio: 'aspect-[3/4]',
    },
    {
        src: '/images/lookbook/tee-rack-night.jpg',
        alt: 'Three graphic tees hanging on a rack against a wire fence at night',
        tag: 'New drop',
        caption: 'Flame series, on the rack',
        ratio: 'aspect-[3/2]',
    },
    {
        src: '/images/lookbook/pink-tee-shoreline.jpg',
        alt: 'Person in an oversized pink Syndicate tee walking through shallow water at the shoreline',
        tag: 'Apparel',
        caption: 'Oversized tee — pink',
        ratio: 'aspect-[2/3]',
    },
    {
        src: '/images/lookbook/flame-tee-cap.jpg',
        alt: 'Person wearing a black flame-graphic tee and matching embroidered cap',
        tag: 'Caps',
        caption: 'Flame cap + tee',
        ratio: 'aspect-[3/4]',
    },
];

const STATS = [
    { value: '14', label: 'Deck graphics' },
    { value: '18', label: 'Wheel colourways' },
    { value: '360°', label: 'Preview before you buy' },
];

export default function Home() {
    // Phase 5 route. Until it exists the CTA points at the sign-up instead of
    // dead-ending — same trick as the nav, see StoreHeader.
    const customizeHref = route().has('customize')
        ? route('customize')
        : route('register');

    return (
        <StorefrontLayout>
            <Head title="Syndicate Supply Co. — Skate & Streetwear, Legazpi" />

            {/* ── Hero ─────────────────────────────────────────────────── */}
            <section className="relative overflow-hidden border-b-2 border-volt-500 bg-ink-950 light:bg-paper">
                {/* Explicit two-column grid, not an absolutely-positioned
                    overlay — HeroBoard needs a real, predictable slot to be
                    genuinely centered in, not "wherever there happens to be
                    empty space" relative to a text column whose height
                    changes with content. `items-center` on the grid centers
                    the board's column against the text column's actual
                    rendered height, at any viewport width. */}
                <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:px-8 lg:py-36">
                    <div>
                        <p className="flex items-center gap-3 font-display text-xs uppercase tracking-[0.35em] text-volt-500 light:text-volt-800">
                            <span className="h-px w-8 bg-volt-500" />
                            Legazpi City · Est. 2024
                        </p>

                        <h1 className="mt-6 font-display uppercase leading-[0.85] tracking-tighter text-white light:text-ink-900">
                            <span className="block text-[clamp(2.75rem,8vw,6.5rem)]">
                                Build your
                            </span>
                            <span className="block text-[clamp(2.75rem,8vw,6.5rem)] text-volt-500 light:text-volt-800">
                                style.
                            </span>
                            <span className="block text-[clamp(2.75rem,8vw,6.5rem)]">
                                Ride safe.
                            </span>
                        </h1>

                        <p className="mt-8 max-w-xl text-base leading-relaxed text-white/60 light:text-ink-900/75 sm:text-lg">
                            Decks, wheels and heavyweight apparel out of
                            Legazpi. Spin the board in 3D, pick your graphic,
                            check it from every angle — then take it to the
                            street.
                        </p>

                        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                            <Link
                                href={customizeHref}
                                className="group inline-flex items-center justify-center gap-3 bg-volt-500 px-8 py-4 font-display text-base uppercase tracking-[0.2em] text-ink-900 transition-all hover:-translate-y-1 hover:bg-white light:hover:bg-ink-900 light:hover:text-white sm:text-lg"
                            >
                                Build a board
                                <span className="transition-transform group-hover:translate-x-1">
                                    →
                                </span>
                            </Link>
                            <a
                                href="#lookbook"
                                className="inline-flex items-center justify-center border-2 border-white/20 px-8 py-4 font-display text-base uppercase tracking-[0.2em] text-white transition-colors hover:border-volt-500 hover:text-volt-500 light:border-ink-900/25 light:text-ink-900 light:hover:border-volt-800 light:hover:text-volt-800 sm:text-lg"
                            >
                                See the lookbook
                            </a>
                        </div>

                        <dl className="mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-white/10 light:border-ink-900/10 pt-8">
                            {STATS.map((stat) => (
                                <div key={stat.label}>
                                    <dt className="sr-only">{stat.label}</dt>
                                    <dd>
                                        <span className="block font-display text-3xl uppercase leading-none text-white light:text-ink-900 sm:text-5xl">
                                            {stat.value}
                                        </span>
                                        <span className="mt-2 block text-[11px] uppercase leading-snug tracking-[0.15em] text-white/40 light:text-ink-900/55">
                                            {stat.label}
                                        </span>
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>

                    {/* Board's own column — hidden below lg (see HeroBoard.jsx
                        for why: Three.js is real weight, not worth it on a
                        phone hero). min-h keeps a tall showcase even where the
                        text column is short, so the board reads as a genuine
                        second "half" of the hero, not a corner decoration. */}
                    <div className="relative hidden min-h-[420px] lg:block lg:min-h-[520px] xl:min-h-[600px]">
                        <HeroBoard />
                    </div>
                </div>
            </section>

            <Marquee
                items={[
                    'New drops weekly',
                    'GCash checkout',
                    'Custom decks',
                    'Legazpi local',
                ]}
            />

            {/* ── Lookbook ─────────────────────────────────────────────── */}
            <section
                id="lookbook"
                className="scroll-mt-20 bg-ink-950 light:bg-paper px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
            >
                <div className="mx-auto max-w-7xl">
                    <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="font-display text-xs uppercase tracking-[0.35em] text-volt-500 light:text-volt-800">
                                The lookbook
                            </p>
                            <h2 className="mt-3 font-display text-[clamp(2rem,7vw,4.5rem)] uppercase leading-[0.9] tracking-tighter text-white light:text-ink-900">
                                Shot on the
                                <br />
                                streets we skate
                            </h2>
                        </div>
                        <p className="max-w-xs text-sm leading-relaxed text-white/40 light:text-ink-900/55">
                            No studio, no stock models. Every piece photographed
                            where it actually gets worn and ridden.
                        </p>
                    </div>

                    <LookbookGrid items={LOOKBOOK} />
                </div>
            </section>

            {/* ── Closing CTA ──────────────────────────────────────────── */}
            <section className="border-t-2 border-volt-500 bg-volt-500">
                <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-20">
                    <h2 className="font-display text-[clamp(2rem,7vw,4.5rem)] uppercase leading-[0.9] tracking-tighter text-ink-900">
                        Make it yours.
                        <br />
                        Then go ride it.
                    </h2>
                    <Link
                        href={customizeHref}
                        className="inline-flex shrink-0 items-center gap-3 bg-ink-900 px-8 py-4 font-display text-base uppercase tracking-[0.2em] text-volt-500 transition-transform hover:-translate-y-1 sm:text-lg"
                    >
                        Start building →
                    </Link>
                </div>
            </section>
        </StorefrontLayout>
    );
}
