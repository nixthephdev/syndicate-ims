/**
 * Buyer ID verification pill. Same literal-colour rule as OrderStatusBadge
 * and StockBadge — these carry meaning (needs looking at / cleared / turned
 * away) and stay outside the volt accent, which means "clickable" elsewhere
 * in this panel.
 *
 * `none` is a neutral chip, not a warning: never having submitted an ID is
 * the starting state of every account, not a problem to chase.
 */
const STYLES = {
    none: {
        pill: 'bg-white/[0.06] text-white/50 admin-light:bg-ink-900/[0.06] admin-light:text-ink-900/50',
        dot: 'bg-white/40 admin-light:bg-ink-900/40',
    },
    pending: { pill: 'bg-amber-500/10 text-amber-400', dot: 'bg-amber-400' },
    approved: { pill: 'bg-green-500/10 text-green-400', dot: 'bg-green-400' },
    rejected: { pill: 'bg-red-500/10 text-red-400', dot: 'bg-red-400' },
};

export default function IdStatusBadge({ status }) {
    const style = STYLES[status] ?? STYLES.none;

    return (
        <span
            className={
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ' +
                style.pill
            }
        >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
            {status === 'none' ? 'not submitted' : status}
        </span>
    );
}
