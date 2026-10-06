import { useFlashToasts } from '@/utils/useFlashToasts';
import { useAdminTheme } from '@/utils/useAdminTheme';

const TONE = {
    success: {
        icon: 'bg-green-500/10 text-green-400',
        title: 'Done',
        path: 'M4.5 12.75l6 6 9-13.5',
    },
    error: {
        icon: 'bg-red-500/10 text-red-400',
        title: "Couldn't do that",
        path: 'M6 18L18 6M6 6l12 12',
    },
};

/**
 * Admin notifications, shown as a pop-up in the centre of the screen (client
 * request, 2026-10-06) — one at a time, newest queued behind. Each still
 * closes itself after a few seconds (useFlashToasts), or on OK / a click on
 * the backdrop. The admin has no cart, so there is no corner placement here.
 *
 * Not a headlessui Dialog: that would trap focus and portal outside
 * AdminLayout's data-admin-theme wrapper. This renders in place, so
 * admin-light: classes apply — the theme attribute is still re-set on the
 * root for safety.
 */
export default function ToastStack() {
    const { toasts, dismiss } = useFlashToasts();
    const { theme } = useAdminTheme();
    const toast = toasts[0];

    if (!toast) return null;

    const tone = TONE[toast.type] ?? TONE.success;

    return (
        <div data-admin-theme={theme} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-ink-950/60" onClick={() => dismiss(toast.id)} aria-hidden="true" />

            <div
                key={toast.id}
                role={toast.type === 'error' ? 'alert' : 'status'}
                aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
                className="relative w-full max-w-sm rounded-md border border-white/10 bg-ink-900 p-6 text-center shadow-2xl animate-pop-in motion-reduce:animate-none admin-light:border-ink-900/10 admin-light:bg-white"
            >
                <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${tone.icon}`}>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d={tone.path} />
                    </svg>
                </span>

                <p className="font-oswald mt-4 text-lg font-semibold uppercase tracking-wide text-white admin-light:text-ink-900">
                    {tone.title}
                </p>
                <p className="mt-1 text-sm text-white/60 admin-light:text-ink-900/70">{toast.message}</p>

                <button
                    type="button"
                    onClick={() => dismiss(toast.id)}
                    autoFocus
                    className="font-oswald mt-5 inline-flex rounded-md bg-volt-500 px-6 py-2 text-xs font-bold uppercase tracking-widest text-ink-900 transition hover:bg-volt-400"
                >
                    OK
                </button>
            </div>
        </div>
    );
}
