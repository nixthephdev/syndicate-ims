const defaultTheme = require('tailwindcss/defaultTheme');
const colors = require('tailwindcss/colors');
const plugin = require('tailwindcss/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
                // Storefront only. Heavy condensed poster face — the whole
                // "skate shop" voice lives in this one font. Loaded in
                // resources/views/app.blade.php. Never used in the admin.
                display: ['Anton', 'Impact', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                // Admin panel's single accent. Aliased to Tailwind's blue so
                // swapping in the shop's real brand colour later is a
                // one-line change here, not a find-and-replace across pages.
                // Deliberately NOT red — DangerButton already owns red for
                // destructive actions; a red accent would put "Save" and
                // "Delete" in the same hue.
                brand: colors.blue,

                // Storefront accent. Kept SEPARATE from `brand` on purpose:
                // the admin is a management tool (restrained blue) and the
                // shop is a skate brand (loud). Changing one must not touch
                // the other. Every storefront page reads these tokens —
                // if the group supplies real brand colours, swap them here.
                volt: {
                    300: '#e6ff70',
                    400: '#dcff3d',
                    500: '#ccff00', // primary accent
                    600: '#a8d400',
                    700: '#7d9e00',
                    // Text-on-light-ground only. #ccff00 as small text on the
                    // light-mode page ground is ~1.2:1 contrast — unreadable.
                    // Never used as a fill/button colour — volt-500 fills stay
                    // literal in both themes, see the `light:` usage notes in
                    // each storefront component. ~4.8:1 on `paper`.
                    800: '#5c7600',
                },
                // Storefront neutrals. Deliberately darker and warmer-black
                // than Tailwind's gray-900 so the volt reads as electric.
                // Also doubles as LIGHT-mode primary text (ink-900) — see
                // `light:` pairings throughout the storefront.
                ink: {
                    700: '#242424',
                    800: '#161616',
                    900: '#0b0b0b',
                    950: '#050505',
                },
                // Light-mode surfaces only — the `light:` counterpart to
                // `ink`. Warm, not clinical white, mirroring ink's own
                // "warmer than gray-900" intent. `paper-field` is
                // deliberately just Tailwind's own `white` (pure, brightest
                // step) rather than a 4th custom shade — use `light:bg-white`
                // for that role (input/tile/image-container backgrounds).
                paper: {
                    DEFAULT: '#f7f6f2', // page ground (light:bg-ink-950 counterpart)
                    panel: '#efeee6', // elevated panel (light:bg-ink-900 counterpart)
                    accent: '#e2e0d4', // gradient/placeholder stop (light:bg-ink-700 counterpart)
                },
            },
            keyframes: {
                // Storefront ticker. Translating -50% works because the
                // marquee renders its content twice — see Marquee.jsx.
                marquee: {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
                // Page-entry transition. Inertia remounts the page component on
                // every navigation, so this replays per visit without any
                // router hooks. Kept small — a big slide reads as jank, not
                // polish, and delays the content the visitor asked for.
                fadeUp: {
                    '0%': { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                // Home hero's 3D board (HeroBoard.jsx) — a slow vertical
                // drift on top of the model's own auto-rotate, so it reads as
                // genuinely floating rather than just spinning in place.
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-16px)' },
                },
            },
            animation: {
                marquee: 'marquee 32s linear infinite',
                'fade-up': 'fadeUp 0.4s ease-out both',
                float: 'float 5s ease-in-out infinite',
            },
        },
    },

    plugins: [
        require('@tailwindcss/forms'),
        // Storefront-only light mode. Existing unprefixed classes keep
        // meaning "dark" (today's only mode, unchanged); `light:` pairs an
        // explicit override at each call site rather than making `ink`/
        // `volt` themselves CSS-variable-backed — see CLAUDE.md's Design
        // section for why (the short version: `text-ink-900` plays two
        // incompatible roles — invertible surface text vs. permanently-dark
        // text pinned on top of a volt/amber/red FILL — and a variable can't
        // tell which one it's being asked for). Admin is untouched: it never
        // reads `data-theme` and has no `light:` classes anywhere.
        plugin(({ addVariant }) => {
            addVariant('light', '[data-theme="light"] &');
        }),
    ],
};
