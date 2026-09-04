import { useEffect, useState } from 'react';

const STORAGE_KEY = 'syndicate-admin-theme';
const EVENT = 'syndicate-admin-theme-change';

function readTheme() {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
    } catch (e) {
        return 'dark';
    }
}

/**
 * Admin's OWN light/dark toggle — deliberately a separate mechanism from the
 * storefront's `useTheme`/`data-theme`/`syndicate-theme` (see that file):
 * switching one must never flip the other. Scoped to `AdminLayout`'s own
 * root element (`data-admin-theme`), not `<html>` — unlike the storefront,
 * the admin has no pre-React boot splash to prevent a flash for (CLAUDE.md:
 * "the admin gets no brand splash"), so there's nothing painted before React
 * mounts that a blade pre-paint script would need to fix; React's own first
 * render already carries the right attribute, read synchronously from
 * localStorage below.
 *
 * Needed as a hook, not pure CSS, because Recharts reads literal hex colour
 * props at render time, not Tailwind classes or CSS custom properties —
 * Dashboard.jsx uses this to pick the right hex per theme for its chart.
 */
export function useAdminTheme() {
    const [theme, setThemeState] = useState(readTheme);

    useEffect(() => {
        const onChange = () => setThemeState(readTheme());
        window.addEventListener(EVENT, onChange);
        return () => window.removeEventListener(EVENT, onChange);
    }, []);

    const setTheme = (next) => {
        setThemeState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch (e) {
            // Storage can throw in locked-down browser contexts — the theme
            // still applies for this page view, it just won't persist.
        }
        window.dispatchEvent(new CustomEvent(EVENT));
    };

    const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

    return { theme, setTheme, toggleTheme };
}
