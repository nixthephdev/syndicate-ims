/**
 * One filter pill — the `tab()` className helper was duplicated verbatim in
 * Orders/Index.jsx and Users/Index.jsx; each page still owns its own
 * onClick/query-param logic (that part genuinely differs per page), only
 * the styling is shared here.
 */
export default function FilterTab({ active, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={
                'font-oswald rounded-md px-3 py-1.5 text-sm font-semibold uppercase tracking-wide transition ' +
                (active
                    ? 'bg-volt-500 text-ink-900'
                    : 'text-white/50 hover:bg-white/[0.06] hover:text-white admin-light:text-ink-900/50 admin-light:hover:bg-ink-900/[0.06] admin-light:hover:text-ink-900')
            }
        >
            {children}
        </button>
    );
}
