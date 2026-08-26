import { useTheme } from '@/utils/useTheme';

/**
 * Sun/moon toggle, fixed bottom-right on every storefront page — rendered
 * once each by StorefrontLayout and StorefrontAuthLayout (the two root
 * shells), never inside the header/nav. Floats over arbitrary page content
 * (product photos, the 3D canvas), so unlike a nav icon it needs its own
 * opaque chrome — a bordered, blurred circle — to stay legible regardless of
 * what's behind it.
 */
export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const isLight = theme === 'light';

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-ink-900/90 text-white shadow-lg shadow-black/30 backdrop-blur transition-colors hover:border-volt-500 hover:text-volt-500 light:border-ink-900/10 light:bg-white/90 light:text-ink-900 light:shadow-black/10 light:hover:border-volt-800 light:hover:text-volt-800 sm:bottom-6 sm:right-6"
        >
            {isLight ? (
                // Sun — shown while light is active, click switches to dark.
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
                    />
                </svg>
            ) : (
                // Moon — shown while dark is active, click switches to light.
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
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
