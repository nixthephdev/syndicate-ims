import { useFlashToasts } from '@/utils/useFlashToasts';

const TONE = {
    success: {
        border: 'border-volt-500',
        text: 'text-volt-300 light:text-volt-800',
        title: 'Done',
        badge: 'bg-volt-500 text-ink-900',
        path: 'M4.5 12.75l6 6 9-13.5',
    },
    error: {
        border: 'border-red-500',
        text: 'text-red-300 light:text-red-700',
        title: 'Hold up',
        badge: 'bg-red-500 text-white',
        path: 'M6 18L18 6M6 6l12 12',
    },
};

function CloseIcon() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

/**
 * Storefront notifications, two placements (see useFlashToasts):
 *   corner — cart add/remove: the small strip top-right, so shopping isn't
 *            interrupted every time something goes in the bag.
 *   center — everything else (order placed, payment, address saved...):
 *            a pop-up in the middle of the screen, client request 2026-10-06.
 * Both still close on their own after a few seconds.
 */
export default function ToastStack() {
    const { toasts, dismiss } = useFlashToasts();
    const corner = toasts.filter((t) => t.placement === 'corner');
    const center = toasts.find((t) => t.placement !== 'corner');

    return (
        <>
            {corner.length > 0 && (
                <div className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:top-6">
                    {corner.map((toast) => {
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
                                    <CloseIcon />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {center && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-ink-950/70" onClick={() => dismiss(center.id)} aria-hidden="true" />

                    <div
                        key={center.id}
                        role={center.type === 'error' ? 'alert' : 'status'}
                        aria-live={center.type === 'error' ? 'assertive' : 'polite'}
                        className={`relative w-full max-w-sm border-2 bg-ink-900 p-7 text-center shadow-2xl light:bg-paper-panel animate-pop-in motion-reduce:animate-none ${(TONE[center.type] ?? TONE.success).border}`}
                    >
                        <span className={`mx-auto flex h-12 w-12 items-center justify-center ${(TONE[center.type] ?? TONE.success).badge}`}>
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d={(TONE[center.type] ?? TONE.success).path} />
                            </svg>
                        </span>

                        <p className="mt-4 font-display text-xl uppercase tracking-wide text-white light:text-ink-900">
                            {(TONE[center.type] ?? TONE.success).title}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-white/60 light:text-ink-900/70">{center.message}</p>

                        <button
                            type="button"
                            onClick={() => dismiss(center.id)}
                            autoFocus
                            className="mt-6 inline-flex bg-volt-500 px-8 py-3 font-display text-sm uppercase tracking-[0.2em] text-ink-900 transition-transform hover:-translate-y-0.5"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
