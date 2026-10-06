import Card from './Card';

const TONES = {
    default: 'text-white admin-light:text-ink-900',
    volt: 'text-volt-500 admin-light:text-volt-800',
    warning: 'text-amber-400 admin-light:text-amber-600',
    danger: 'text-red-400 admin-light:text-red-600',
};

/**
 * A compact figure tile for the top of a list page (Products, Skate
 * Components) — the Dashboard's StatCard minus the trend/sparkline, which
 * only make sense for revenue. Clickable when given onClick, so a tile can
 * double as a filter shortcut ("12 low stock" → show them).
 */
export default function StatTile({ label, value, hint, tone = 'default', icon: Icon, onClick, active = false }) {
    const body = (
        <>
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-white/40 admin-light:text-ink-900/50">{label}</p>
                {Icon && <Icon className="h-4 w-4 text-white/30 admin-light:text-ink-900/35" />}
            </div>
            <p className={`font-oswald mt-2 text-3xl font-bold ${TONES[tone] ?? TONES.default}`}>{value}</p>
            {hint && <p className="mt-0.5 text-xs text-white/35 admin-light:text-ink-900/45">{hint}</p>}
        </>
    );

    if (!onClick) {
        return <Card className="px-5 py-4">{body}</Card>;
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className={
                'rounded-md border bg-ink-900 px-5 py-4 text-left transition hover:border-volt-500/50 admin-light:bg-white ' +
                (active ? 'border-volt-500 admin-light:border-volt-800' : 'border-white/10 admin-light:border-ink-900/10')
            }
        >
            {body}
        </button>
    );
}
