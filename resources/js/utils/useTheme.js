import { useEffect, useState } from 'react';

const STORAGE_KEY = 'syndicate-theme';
const EVENT = 'syndicate-theme-change';

/**
 * Storefront-only light/dark toggle. Most components need zero JS for this —
 * every colour is a Tailwind `light:` pair reacting to the `data-theme`
 * attribute app.blade.php's inline head script already sets before first
 * paint (see that file for the FOUC-prevention reasoning). This hook exists
 * only for the handful of things that CAN'T be reached by a CSS variant:
 * the header/auth-layout toggle button itself (needs to know which icon to
 * show), and two spots that set raw hex on non-Tailwind targets —
 * Scene.jsx's Three.js canvas background and Customize.jsx's drei <Loader>
 * inline style props.
 *
 * Deliberately a DOM CustomEvent, not React Context: there are only three
 * consumers and none of them are nested in a shared parent worth wrapping in
 * a Provider. If the toggle in StoreHeader flips the theme while /customize
 * is already mounted, Scene.jsx's canvas colour needs to follow — the event
 * is what keeps it in sync without a Provider tree.
 */
export function useTheme() {
    const [theme, setThemeState] = useState(
        () => document.documentElement.dataset.theme ?? 'dark'
    );

    useEffect(() => {
        const onChange = () => {
            setThemeState(document.documentElement.dataset.theme ?? 'dark');
        };

        window.addEventListener(EVENT, onChange);

        return () => window.removeEventListener(EVENT, onChange);
    }, []);

    const setTheme = (next) => {
        document.documentElement.setAttribute('data-theme', next);

        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch (e) {
            // Same reasoning as the blade head script: storage can throw in
            // locked-down browser contexts. The theme still applies for this
            // page view via the attribute above; it just won't persist.
        }

        window.dispatchEvent(new CustomEvent(EVENT));
    };

    const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

    return { theme, setTheme, toggleTheme };
}
