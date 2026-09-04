import { useFlashToasts } from '@/utils/useFlashToasts';

const TONE = {
    success: {
        border: 'border-volt-500',
        text: 'text-volt-300 light:text-volt-800',
    },
    error: {
        border: 'border-red-500',
        text: 'text-red-300 light:text-red-700',
    },
};

/**
 * Floating success/error notifications for the storefront — reuses the
 * exact "notice strip" language already established across Login.jsx /
 * StorefrontLayout's old inline banner (border-l-2 + volt/red), just as a
 * dismissible, auto-clearing card instead of a static full-width block.
 * Self-contained: drop it into a layout with no props. Positioned clear of
 * ThemeToggle's fixed bottom-right spot.
 */
export default function ToastStack() {
    const { toasts, dismiss } = useFlashToasts();

    if (toasts.length === 0) return null;

    return (
        <div className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:top-6">
            {toasts.map((toast) => {
                const tone = TONE[toast.type] ?? TONE.success;

                return (
                    <div
                        key={toast.id}
                        role={toast.type === 'error' ? 'alert' : 'status'}
                        aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
                        className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 border-l-2 bg-ink-800 p-4 shadow-lg light:bg-white light:shadow-md animate-toast-in motion-reduce:animate-none ${tone.border}`}
                    >
                        <p className={`flex-1 text-sm ${tone.text}`}>{toast.message}</p>

                        <button
                            type="button"
                            onClick={() => dismiss(toast.id)}
                            aria-label="Dismiss"
                            className="shrink-0 text-white/40 transition-colors hover:text-white light:text-ink-900/40 light:hover:text-ink-900"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
