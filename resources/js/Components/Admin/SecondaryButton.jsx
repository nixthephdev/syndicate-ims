/**
 * The outlined button paired with PrimaryButton — Orders/Show.jsx's
 * "Cancel order" today. The classes are exported for links that should look
 * like it (a CSV download is navigation, and a <button> inside an <a> is
 * invalid HTML).
 */
export const secondaryButtonClasses =
    'font-oswald inline-flex items-center justify-center gap-2 rounded-md border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/70 transition hover:border-white/25 hover:text-white disabled:opacity-40 admin-light:border-ink-900/15 admin-light:text-ink-900/70 admin-light:hover:border-ink-900/30 admin-light:hover:text-ink-900';

export default function SecondaryButton({ icon: Icon, children, className = '', ...props }) {
    return (
        <button
            type={props.type ?? 'button'}
            className={`${secondaryButtonClasses} ${className}`}
            {...props}
        >
            {Icon && <Icon className="h-4 w-4" />}
            {children}
        </button>
    );
}
