/**
 * Order status pill. Like StockBadge, these colours sit outside the volt
 * accent on purpose — they carry meaning (needs chasing / needs handing over /
 * done / dead) and must stay legible whatever the brand accent becomes.
 * `paid` stays literal blue rather than volt deliberately — a status colour
 * must never be mistaken for "this is a clickable action."
 */
const STYLES = {
    pending: {
        pill: 'bg-white/[0.06] text-white/50 admin-light:bg-ink-900/[0.06] admin-light:text-ink-900/50',
        dot: 'bg-white/40 admin-light:bg-ink-900/40',
    },
    awaiting_payment: { pill: 'bg-amber-500/10 text-amber-400', dot: 'bg-amber-400' },
    // A 50% delivery deposit — partially settled, distinct from both
    // "nothing paid yet" (amber) and "fully paid" (blue).
    deposit_paid: { pill: 'bg-cyan-500/10 text-cyan-400', dot: 'bg-cyan-400' },
    paid: { pill: 'bg-blue-500/10 text-blue-400', dot: 'bg-blue-400' },
    fulfilled: { pill: 'bg-green-500/10 text-green-400', dot: 'bg-green-400' },
    cancelled: {
        pill: 'bg-white/[0.06] text-white/30 admin-light:bg-ink-900/[0.06] admin-light:text-ink-900/35',
        dot: 'bg-white/25 admin-light:bg-ink-900/25',
    },
    failed: { pill: 'bg-red-500/10 text-red-400', dot: 'bg-red-400' },
};

export default function OrderStatusBadge({ status }) {
    const style = STYLES[status] ?? STYLES.pending;

    return (
        <span
            className={
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ' + style.pill
            }
        >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
            {status.replace(/_/g, ' ')}
        </span>
    );
}
