import { forwardRef, useEffect, useRef } from 'react';

/**
 * Dark form controls for the storefront's auth pages.
 *
 * These deliberately DO NOT touch @/Components/TextInput, PrimaryButton,
 * InputLabel or Checkbox — those are shared with the admin product screens and
 * the profile page, which are light-surface and must stay that way (see the
 * Design section of CLAUDE.md). Restyling the shared components to be dark
 * would drag the admin along with them.
 */

/** Label + input + error as one unit — every auth field repeats this shape. */
export const Field = forwardRef(function Field(
    { id, label, type = 'text', error, autoFocus = false, className = '', ...props },
    ref
) {
    const input = ref ?? useRef();

    useEffect(() => {
        if (autoFocus) {
            input.current?.focus();
        }
    }, []);

    return (
        <div className={className}>
            <label
                htmlFor={id}
                className="mb-2 block font-display text-xs uppercase tracking-[0.25em] text-white/50 light:text-ink-900/65"
            >
                {label}
            </label>

            <input
                {...props}
                id={id}
                ref={input}
                type={type}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                className={
                    'block w-full rounded-none border-2 bg-ink-800 px-4 py-3 text-white placeholder-white/25 ' +
                    'light:bg-white light:text-ink-900 light:placeholder-ink-900/35 ' +
                    'transition-colors focus:outline-none focus:ring-0 ' +
                    // Chrome paints autofilled inputs pale yellow, which on a
                    // near-black form looks broken. There is no background
                    // override for it — an inset shadow is the only thing that
                    // covers it, and the text colour needs its own property.
                    // Light mode's own autofill yellow is the expected native
                    // look on a white field, so it only needs a dark-mode fix.
                    'autofill:shadow-[inset_0_0_0_1000px_#161616] autofill:[-webkit-text-fill-color:#fff] ' +
                    'light:autofill:shadow-none light:autofill:[-webkit-text-fill-color:theme(colors.ink.900)] ' +
                    (error
                        ? 'border-red-500 focus:border-red-400'
                        : 'border-white/15 focus:border-volt-500 light:border-ink-900/20 light:focus:border-volt-800')
                }
            />

            {error && (
                <p
                    id={`${id}-error`}
                    className="mt-2 text-sm font-medium text-red-400 light:text-red-700"
                >
                    {error}
                </p>
            )}
        </div>
    );
});

/**
 * Volt submit button. Full-width by default (every auth/checkout form wants
 * that); pass `fullWidth={false}` for an inline settings-form "Save" — a
 * className override would not reliably win against `w-full` since Tailwind's
 * precedence follows stylesheet order, not class-attribute order.
 */
export function SubmitButton({ processing, fullWidth = true, children, className = '', ...props }) {
    return (
        <button
            {...props}
            type="submit"
            disabled={processing}
            className={
                'group inline-flex items-center justify-center gap-3 bg-volt-500 px-8 py-4 ' +
                (fullWidth ? 'w-full ' : '') +
                'font-display text-base uppercase tracking-[0.2em] text-ink-900 transition-all ' +
                'hover:-translate-y-0.5 hover:bg-white light:hover:bg-ink-900 light:hover:text-white focus:outline-none focus:ring-2 ' +
                'focus:ring-volt-500 focus:ring-offset-2 focus:ring-offset-ink-950 light:focus:ring-offset-paper ' +
                'disabled:pointer-events-none disabled:opacity-40 ' +
                className
            }
        >
            {children}
            <span className="transition-transform group-hover:translate-x-1">→</span>
        </button>
    );
}

/** Outlined, for a lower-emphasis action next to a SubmitButton — e.g. "Cancel". */
export function GhostButton({ children, className = '', ...props }) {
    return (
        <button
            {...props}
            className={
                'inline-flex items-center justify-center gap-2 border-2 border-white/15 px-8 py-4 ' +
                'font-display text-base uppercase tracking-[0.2em] text-white/70 transition-colors ' +
                'light:border-ink-900/20 light:text-ink-900/70 ' +
                'hover:border-volt-500 hover:text-volt-500 light:hover:border-volt-800 light:hover:text-volt-800 focus:outline-none focus:ring-2 ' +
                'focus:ring-volt-500 focus:ring-offset-2 focus:ring-offset-ink-950 light:focus:ring-offset-paper ' +
                'disabled:pointer-events-none disabled:opacity-40 ' +
                className
            }
        >
            {children}
        </button>
    );
}

/** Outlined red — the one place the storefront borrows a semantic colour
 * outside volt, matching DangerButton's role in the admin. */
export function DangerButton({ children, className = '', ...props }) {
    return (
        <button
            {...props}
            className={
                'inline-flex items-center justify-center gap-2 border-2 border-red-500/60 px-8 py-4 ' +
                'font-display text-base uppercase tracking-[0.2em] text-red-400 light:text-red-700 transition-colors ' +
                'hover:border-red-400 hover:bg-red-500/10 hover:text-red-300 light:hover:text-red-800 focus:outline-none ' +
                'focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-ink-950 light:focus:ring-offset-paper ' +
                'disabled:pointer-events-none disabled:opacity-40 ' +
                className
            }
        >
            {children}
        </button>
    );
}

/** Checkbox + label. The forms plugin resets it, so colours are explicit. */
export function CheckboxRow({ id, label, ...props }) {
    return (
        <label htmlFor={id} className="flex cursor-pointer items-center gap-3">
            <input
                {...props}
                id={id}
                type="checkbox"
                className="h-4 w-4 rounded-none border-2 border-white/25 bg-ink-800 text-volt-500 focus:ring-volt-500 focus:ring-offset-0 focus:ring-offset-ink-950 light:border-ink-900/30 light:bg-white light:focus:ring-offset-paper"
            />
            <span className="text-sm text-white/60 light:text-ink-900/75">{label}</span>
        </label>
    );
}
