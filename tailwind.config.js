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
            },
            colors: {
                // Admin panel's single accent. Aliased to Tailwind's blue so
                // swapping in the shop's real brand colour later is a
                // one-line change here, not a find-and-replace across pages.
                // Deliberately NOT red — DangerButton already owns red for
                // destructive actions; a red accent would put "Save" and
                // "Delete" in the same hue.
                brand: colors.blue,
            },
        },
    },

    plugins: [require('@tailwindcss/forms')],
};
