import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

/**
 * The bell's data, shared by the admin and storefront bells (presentation
 * stays separate per panel — this hook is the only thing they share).
 *
 * Plain JSON over axios rather than an Inertia reload: the bell sits in the
 * layout on every page, and an Inertia visit would cancel whatever the user
 * was doing. Polled while the tab is visible — see useLiveReload for why
 * polling rather than push.
 */
export function useNotifications(intervalMs = 8000) {
    const [state, setState] = useState({ unread: 0, items: [], loaded: false });

    const refresh = useCallback(() => {
        if (document.hidden) return;
        axios
            .get(route('notifications.index'))
            .then(({ data }) => setState({ ...data, loaded: true }))
            .catch(() => {});
    }, []);

    useEffect(() => {
        refresh();
        const id = setInterval(refresh, intervalMs);
        document.addEventListener('visibilitychange', refresh);
        return () => {
            clearInterval(id);
            document.removeEventListener('visibilitychange', refresh);
        };
    }, [refresh, intervalMs]);

    const markRead = useCallback((id = null) => {
        setState((s) => ({
            ...s,
            unread: id ? Math.max(0, s.unread - (s.items.find((n) => n.id === id && !n.read) ? 1 : 0)) : 0,
            items: s.items.map((n) => (!id || n.id === id ? { ...n, read: true } : n)),
        }));
        return axios.post(route('notifications.read'), id ? { id } : {}).catch(() => {});
    }, []);

    return { ...state, refresh, markRead };
}
