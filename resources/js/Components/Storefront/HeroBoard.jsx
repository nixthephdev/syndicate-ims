import { lazy, Suspense } from 'react';

// Lazy-loaded on purpose: Three.js + React Three Fiber currently only ship
// on /customize. Importing Scene directly here would pull that ~900KB chunk
// into the Home page bundle too — the highest-traffic page on the site.
// This keeps it a separate chunk fetched after the initial page paint.
const Scene = lazy(() => import('@/Components/Customizer/Scene'));

/**
 * Decorative hero showcase — a real deck + wheel pair (not a picker, nothing
 * purchasable here), auto-rotating so it reads as alive without requiring a
 * visitor to drag it. Fixed to one striking colourway ("Abstract" deck, red
 * BB wheels) rather than cycling, since this is brand decoration, not a
 * product chooser — that job belongs to /customize.
 *
 * Fills its parent completely (Home.jsx gives it a dedicated grid column with
 * a min-height) rather than sizing/positioning itself — a component that
 * insists on its own fixed px box can't be centered against a text column
 * whose height varies with content; the parent's `items-center` grid does
 * that instead, and this just fills the slot it's given.
 *
 * Three stacked effects, each doing one job:
 *  - Two blurred volt-green circles (a big soft outer glow + a tighter
 *    brighter inner one) for a layered "aura" rather than one flat blob.
 *  - A blurred dark ellipse under the board's resting position, so it reads
 *    as floating above a surface rather than pasted on the background.
 *  - `animate-float` (tailwind.config.js) drifts the whole canvas up/down on
 *    top of the model's own auto-rotate — two independent motions read as
 *    "alive"; either alone reads as either "spinning in place" or "static."
 */
export default function HeroBoard() {
    return (
        <div className="absolute inset-0">
            <div
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 h-[85%] w-[85%] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-volt-500/20 blur-3xl"
            />
            <div
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 h-[45%] w-[45%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-volt-500/30 blur-2xl"
            />
            <div
                aria-hidden="true"
                className="absolute bottom-[12%] left-1/2 h-8 w-2/3 -translate-x-1/2 rounded-full bg-black/50 blur-xl light:bg-ink-900/20"
            />

            <div className="absolute inset-0 animate-float">
                <Suspense
                    fallback={
                        <div className="absolute left-1/2 top-1/2 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-white/5 light:bg-ink-900/5" />
                    }
                >
                    <Scene
                        deckMeshName="abstract"
                        wheelsMeshName="bbRED"
                        transparentBackground
                        autoRotate
                        enableZoom={false}
                        enablePan={false}
                        accentColor="#ccff00"
                    />
                </Suspense>
            </div>
        </div>
    );
}
