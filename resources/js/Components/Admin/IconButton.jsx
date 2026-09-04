/**
 * Icon-only row action — originally defined inline in VariantRow.jsx for its
 * pencil/trash pair; promoted here so every other plain-text row action
 * (Save/Cancel, etc.) reuses the same convention instead of a second
 * hand-rolled copy.
 */
export default function IconButton({ onClick, label, tone, type = 'button', disabled, children }) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
            className={`inline-flex p-1.5 transition-colors disabled:opacity-40 admin-light:text-ink-900/40 ${
                tone === 'danger'
                    ? 'text-white/40 hover:text-red-400'
                    : 'text-white/40 hover:text-volt-500 admin-light:hover:text-volt-800'
            }`}
        >
            {children}
        </button>
    );
}
