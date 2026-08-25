import { useState } from 'react';

/**
 * One lookbook photo.
 *
 * `src` currently points at a placeholder service, so the tile falls back to
 * a generated block if the image 404s or the machine is offline — a demo on
 * a flaky campus connection should not render a grid of broken-image icons.
 * Swap `src` for files under public/images/lookbook/ and the fallback simply
 * stops firing.
 */
export default function LookbookTile({ src, alt, tag, caption, ratio, eager = false, className = '' }) {
    const [failed, setFailed] = useState(false);

    return (
        <figure
            className={`group relative mb-4 block break-inside-avoid overflow-hidden bg-ink-800 ${className}`}
        >
            <div className={`relative w-full ${ratio}`}>
                {failed ? (
                    // Placeholder stand-in: diagonal volt/ink block, no network.
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-ink-700 via-ink-800 to-ink-950">
                        <span className="font-display text-3xl uppercase tracking-widest text-white/10">
                            {tag}
                        </span>
                    </div>
                ) : (
                    <img
                        src={src}
                        alt={alt}
                        // The top row is above the fold — lazy-loading it just
                        // delays the largest paint. Everything below stays lazy.
                        loading={eager ? 'eager' : 'lazy'}
                        decoding="async"
                        onError={() => setFailed(true)}
                        // Full colour, NOT grayscale-until-hover. The shop sells
                        // mint, pink and red apparel and shoots it on Albay
                        // beaches — desaturating that hides the product. Hover
                        // gets a scale + brightness lift instead.
                        className="absolute inset-0 h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105 group-hover:brightness-110"
                    />
                )}

                {/* Bottom scrim so the caption stays readable on any photo. */}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/10 to-transparent opacity-80 transition-opacity group-hover:opacity-60" />

                <span className="absolute left-3 top-3 bg-volt-500 px-2 py-1 font-display text-[11px] uppercase leading-none tracking-[0.18em] text-ink-900">
                    {tag}
                </span>

                <figcaption className="absolute bottom-0 left-0 right-0 translate-y-1 p-4 opacity-90 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <span className="font-display text-lg uppercase leading-tight tracking-wide text-white sm:text-xl">
                        {caption}
                    </span>
                </figcaption>
            </div>
        </figure>
    );
}
