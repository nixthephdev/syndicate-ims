/**
 * Red/amber/green stock status. Deliberately outside the brand-blue accent —
 * these three colours are already doing semantic work (out/low/healthy) and
 * must stay legible regardless of whatever the brand accent is.
 */
export default function StockBadge({ stock, isLowStock, isOutOfStock }) {
    let classes = 'bg-green-50 text-green-700 ring-green-600/20';
    let label = `${stock} in stock`;

    if (isOutOfStock) {
        classes = 'bg-red-50 text-red-700 ring-red-600/20';
        label = 'Out of stock';
    } else if (isLowStock) {
        classes = 'bg-amber-50 text-amber-700 ring-amber-600/20';
        label = `${stock} left — low`;
    }

    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${classes}`}>
            {label}
        </span>
    );
}
