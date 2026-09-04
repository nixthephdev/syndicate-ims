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
                // Admin only — condensed headline/stat-figure face, paired
                // with jakarta for body/UI. Loaded in app.blade.php alongside
                // anton/figtree (same bunny.net link, no new font host).
                oswald: ['Oswald', ...defaultTheme.fontFamily.sans],
                jakarta: ['"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                // Storefront accent — and, since the admin panel adopted the
                // same dark/volt direction, the admin's accent too. Same
                // token, same hex, used two completely different ways: the
                // shop is loud (Anton, marquees, full-bleed photography), the
                // admin stays a restrained tool (Oswald/Jakarta, sharp 6px
                // corners, dense tables) that merely happens to share this
                // one colour and the `ink` neutrals below. Neither side
                // imports the other's JSX components — that's still the
                // real separation, not the hex value. If the group supplies
                // real brand colours later, swap them here once.
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
                // Shared neutral scale — storefront (also doubles as its
                // LIGHT-mode primary text, see `light:` pairings there) and,
                // since the admin panel's dark pass, the admin too. Warmer
                // than Tailwind's cool-toned `gray`, which is exactly why the
                // admin adopted it instead of inventing a second near-black.
                ink: {
                    700: '#242424',
                    800: '#161616',
                    900: '#0b0b0b',
                    950: '#050505',
                },
                // Admin-only, and only for the one place a full-brightness
                // `volt-500` genuinely fails as a chart mark: the Apparel-vs-
                // Skateboard donut. Both pre-validated with the dataviz
                // skill's OKLCH/CVD checker against the admin's dark surface
                // — `volt-500` itself sits far outside the categorical
                // lightness band a data mark needs, so this is a dimmed
                // chart-safe sibling, not the same colour reused. `volt-500`
                // stays reserved for buttons/active-states/glow/the sales
                // chart's own line (a solo series — no CVD pairing applies).
                'chart-lime': '#6B8E00',
                'chart-blue': '#3987E5',
                // Same donut, admin LIGHT mode. A dark-surface-safe mark
                // isn't automatically light-surface-safe (different
                // lightness band) — these are the light-mode siblings,
                // re-validated with the dataviz skill's checker against the
                // admin's light surface (`paper`/`white`), not reused as-is.
                'chart-lime-light': '#5C7A00',
                'chart-blue-light': '#2A78D6',
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
                // Toast enter (Admin/Storefront ToastStack). A bare motion
                // utility, not a brand choice — shared by both toast
                // components even though admin/storefront otherwise never
                // share UI, same as they already share `rounded-md`/
                // `shadow-lg`.
                toastIn: {
                    '0%': { opacity: '0', transform: 'translateX(1rem)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
            },
            animation: {
                marquee: 'marquee 32s linear infinite',
                'fade-up': 'fadeUp 0.4s ease-out both',
                float: 'float 5s ease-in-out infinite',
                'toast-in': 'toastIn 0.25s ease-out both',
            },
        },
    },

    plugins: [
        require('@tailwindcss/forms'),
        // Storefront light mode. Existing unprefixed classes keep meaning
        // "dark" (today's only mode, unchanged); `light:` pairs an explicit
        // override at each call site rather than making `ink`/`volt`
        // themselves CSS-variable-backed — see CLAUDE.md's Design section
        // for why (the short version: `text-ink-900` plays two incompatible
        // roles — invertible surface text vs. permanently-dark text pinned
        // on top of a volt/amber/red FILL — and a variable can't tell which
        // one it's being asked for). Reacts to `data-theme` on <html>.
        plugin(({ addVariant }) => {
            addVariant('light', '[data-theme="light"] &');
        }),
        // Admin's OWN light mode — deliberately a separate variant/attribute
        // from the storefront's `light:` above, reacting to `data-admin-theme`
        // instead of `data-theme`. Two panels, two toggles: switching one
        // must never flip the other, and they don't even share the DOM node
        // that carries the attribute (storefront: <html>; admin: AdminLayout's
        // own root div — see useAdminTheme.js for why that's fine here and
        // isn't for the storefront).
        plugin(({ addVariant }) => {
            addVariant('admin-light', '[data-admin-theme="light"] &');
        }),
    ],
};
