import { useFlashToasts } from '@/utils/useFlashToasts';

const TONE = {
    success: {
        border: 'border-green-500/40',
        icon: 'bg-green-500/10 text-green-400',
        text: 'text-green-300 admin-light:text-green-700',
        path: 'M4.5 12.75l6 6 9-13.5',
    },
    error: {
        border: 'border-red-500/40',
        icon: 'bg-red-500/10 text-red-400',
        text: 'text-red-300 admin-light:text-red-700',
        path: 'M6 18L18 6M6 6l12 12',
    },
};

/**
 * Floating success/error notifications for the admin panel — same
 * restrained language as the rest of /admin (dark card, one of the two
 * semantic colors StockBadge already owns, no volt here — a toast is
 * status, not an action). Self-contained: drop it into a layout with no
 * props, it reads flash/status/errors itself via useFlashToasts().
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
                        className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border bg-ink-900 p-4 shadow-lg shadow-black/30 animate-toast-in motion-reduce:animate-none admin-light:bg-white admin-light:shadow-black/10 ${tone.border}`}
                    >
                        <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${tone.icon}`}>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d={tone.path} />
                            </svg>
                        </span>

                        <p className={`flex-1 text-sm ${tone.text}`}>{toast.message}</p>

                        <button
                            type="button"
                            onClick={() => dismiss(toast.id)}
                            aria-label="Dismiss"
                            className="shrink-0 text-white/40 transition-colors hover:text-white admin-light:text-ink-900/40 admin-light:hover:text-ink-900"
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
