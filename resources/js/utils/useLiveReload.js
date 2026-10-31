import { router } from '@inertiajs/react';
import { useEffect } from 'react';

/**
 * Keeps a page's data current without the visitor reloading (client,
 * 2026-10-31: "make it real time"). Re-asks the server for just the named
 * props every few seconds — a partial Inertia reload — while the tab is
 * visible.
 *
 * Polling, not websockets, on purpose: push needs Laravel Reverb (Laravel
 * 11+) or a hosted Pusher account, and this runs on Laravel 9 on a laptop
 * with no guaranteed internet. A few seconds' delay reads as live.
 *
 * Two traps this avoids, both from reading @inertiajs/core 1.3's source:
 *  - Inertia runs ONE visit at a time and cancels the active one when a new
 *    one starts. A poll landing mid-click would silently cancel the staff
 *    member's "Mark as delivered". So a poll never starts while any other
 *    visit is in flight.
 *  - A partial reload MERGES its props over the page's old ones. If `flash`
 *    isn't re-fetched, last action's success message survives in the props
 *    and every poll's 'success' event would toast it again. So `flash` is
 *    always asked for too — it comes back empty and overwrites it.
 */
let visitsInFlight = 0;

if (typeof window !== 'undefined') {
    router.on('start', () => {
        visitsInFlight++;
    });
    router.on('finish', () => {
        visitsInFlight = Math.max(0, visitsInFlight - 1);
    });
}

export function useLiveReload(only, intervalMs = 5000) {
    const key = only.join(',');

    useEffect(() => {
        const tick = () => {
            if (document.hidden || visitsInFlight > 0) return;
            router.reload({ only: [...only, 'flash'] });
        };

        const id = setInterval(tick, intervalMs);
        // Coming back to the tab: catch up at once rather than on the next tick.
        const onVisible = () => !document.hidden && tick();
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            clearInterval(id);
            document.removeEventListener('visibilitychange', onVisible);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, intervalMs]);
}
