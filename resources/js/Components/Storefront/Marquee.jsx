/**
 * Infinite scrolling ticker. The `items` list is rendered TWICE side by side
 * and the track is translated -50%, so the second copy lands exactly where
 * the first started and the loop is seamless.
 *
 * Honours prefers-reduced-motion via `motion-reduce:animate-none`.
 */
export default function Marquee({ items, className = '' }) {
    const track = [...items, ...items];

    return (
        <div
            className={
                'relative flex overflow-hidden border-y-2 border-ink-900 bg-volt-500 ' +
                className
            }
        >
            <div
                aria-hidden="true"
                className="flex w-max shrink-0 animate-marquee items-center py-3 motion-reduce:animate-none"
            >
                {track.map((item, i) => (
                    <span
                        key={i}
                        className="flex items-center whitespace-nowrap font-display text-lg uppercase tracking-[0.2em] text-ink-900 sm:text-xl"
                    >
                        {item}
                        <span className="mx-6 text-ink-900/40 sm:mx-8">✕</span>
                    </span>
                ))}
            </div>
        </div>
    );
}
