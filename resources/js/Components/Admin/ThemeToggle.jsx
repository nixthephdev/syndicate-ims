import { useAdminTheme } from '@/utils/useAdminTheme';

/**
 * Topbar icon button, beside the clock — matches the approved "Control Room"
 * mockup's placement exactly. Unlike the storefront's floating corner toggle
 * (which has to stay legible over arbitrary page content), this one sits in
 * a fixed chrome bar, so it can be a plain bordered square like every other
 * topbar icon button.
 */
export default function ThemeToggle() {
    const { theme, toggleTheme } = useAdminTheme();
    const isLight = theme === 'light';

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 text-white/50 transition hover:border-white/25 hover:text-white admin-light:border-ink-900/10 admin-light:text-ink-900/50 admin-light:hover:border-ink-900/25 admin-light:hover:text-ink-900"
        >
            {isLight ? (
                // Sun — shown while light is active, click switches to dark.
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
                    />
                </svg>
            ) : (
                // Moon — shown while dark is active, click switches to light.
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
                    />
                </svg>
            )}
        </button>
    );
}
