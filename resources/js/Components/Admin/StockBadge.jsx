/**
 * Red/amber/green stock status. Deliberately outside the volt accent —
 * these three colours are already doing semantic work (out/low/healthy) and
 * must stay legible regardless of whatever the brand accent is.
 *
 * `threshold` is optional — when passed, a filled proportion bar (stock /
 * threshold, capped at 100%) renders under the count so "4 left" and
 * "40 left" against the same threshold read differently at a glance, not
 * just as the same-looking pill with a different number inside it.
 */
export default function StockBadge({ stock, isLowStock, isOutOfStock, threshold }) {
    let classes = 'bg-green-500/10 text-green-400 ring-green-500/20';
    let barClasses = 'bg-green-500';
    let label = `${stock} in stock`;

    if (isOutOfStock) {
        classes = 'bg-red-500/10 text-red-400 ring-red-500/20';
        barClasses = 'bg-red-500';
        label = 'Out of stock';
    } else if (isLowStock) {
        classes = 'bg-amber-500/10 text-amber-400 ring-amber-500/20';
        barClasses = 'bg-amber-500';
        label = `${stock} left — low`;
    }

    const showBar = typeof threshold === 'number' && threshold > 0;
    const fillPercent = showBar ? Math.min(100, Math.round((stock / threshold) * 100)) : 0;

    return (
        <span className="inline-flex flex-col gap-1">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset w-fit ${classes}`}>
                {label}
            </span>
            {showBar && (
                <span className="block h-1 w-20 rounded-full bg-white/10 overflow-hidden admin-light:bg-ink-900/10">
                    <span className={`block h-full rounded-full ${barClasses}`} style={{ width: `${fillPercent}%` }} />
                </span>
            )}
        </span>
    );
}
