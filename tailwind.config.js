const defaultTheme = require('tailwindcss/defaultTheme');
const colors = require('tailwindcss/colors');

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
                },
                // Storefront neutrals. Deliberately darker and warmer-black
                // than Tailwind's gray-900 so the volt reads as electric.
                ink: {
                    700: '#242424',
                    800: '#161616',
                    900: '#0b0b0b',
                    950: '#050505',
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
            },
            animation: {
                marquee: 'marquee 32s linear infinite',
                'fade-up': 'fadeUp 0.4s ease-out both',
            },
        },
    },

    plugins: [require('@tailwindcss/forms')],
};
