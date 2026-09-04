/**
 * The `bg-ink-900 rounded-md border border-white/10` wrapper repeated
 * near-identically across every admin page (~20 call sites before this
 * existed) — one shared copy so the dark surface tone lives in one place,
 * not twenty near-identical strings that could each drift.
 */
export default function Card({ className = '', children }) {
    return (
        <div className={`rounded-md border border-white/10 bg-ink-900 admin-light:border-ink-900/10 admin-light:bg-white ${className}`}>
            {children}
        </div>
    );
}
