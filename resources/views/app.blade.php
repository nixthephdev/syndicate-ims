<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Theme, read and applied before ANYTHING else paints — including
             the boot splash below. Synchronous, not deferred: a flash of the
             wrong theme is exactly the bug this exists to prevent. Always
             sets one value or the other, never leaves the attribute absent —
             resources/js/utils/useTheme.js treats "absent" as an error case,
             not as "assume dark". Wrapped in try/catch because localStorage
             can throw in locked-down browser contexts (private mode with
             storage blocked, some in-app webviews) and this must never be
             what breaks page load. Admin never reads data-theme — this runs
             on every page regardless, but is inert there. --}}
        <script>
            try {
                var t = localStorage.getItem('syndicate-theme');
                document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : 'dark');
            } catch (e) {
                document.documentElement.setAttribute('data-theme', 'dark');
            }
        </script>

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        {{-- Favicons: dark brain mark on volt. Baked background on purpose —
             a transparent white mark disappears on light browser tab bars.
             Generated from public/files/images/logo.jpg, see CLAUDE.md. --}}
        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png">
        <link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16x16.png">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">
        <meta name="theme-color" content="#0b0b0b">

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        {{-- figtree = UI/body (admin + storefront). anton = storefront display face only. --}}
        <link href="https://fonts.bunny.net/css?family=anton:400|figtree:400,500,600,700,800&display=swap" rel="stylesheet" />

        {{-- Boot splash, shown only for customer-facing pages. The admin is a
             management tool and stays restrained — it gets no brand splash.
             See the Design section of CLAUDE.md. --}}
        @php
            $showSplash = \Illuminate\Support\Str::startsWith($page['component'], ['Storefront/', 'Auth/']);
        @endphp

        @if ($showSplash)
            {{-- This CSS is inline, NOT Tailwind, on purpose: the compiled
                 stylesheet is still downloading at the moment the splash needs
                 to be visible. A Tailwind-classed splash flashes unstyled. --}}
            <style>
                #app-splash {
                    position: fixed; inset: 0; z-index: 9999;
                    display: flex; flex-direction: column;
                    align-items: center; justify-content: center; gap: 1.75rem;
                    background: #050505;
                    transition: opacity .35s ease, visibility .35s ease;
                }
                #app-splash.is-done { opacity: 0; visibility: hidden; }
                #app-splash .mark { width: 72px; height: auto; animation: splash-pulse 1.6s ease-in-out infinite; }
                #app-splash .bar { position: relative; width: 150px; height: 2px; background: rgba(255,255,255,.12); overflow: hidden; }
                #app-splash .bar i { position: absolute; inset: 0 auto 0 0; width: 40%; background: #ccff00; animation: splash-slide 1.1s ease-in-out infinite; }
                @keyframes splash-pulse { 0%,100% { opacity:.5 } 50% { opacity:1 } }
                @keyframes splash-slide { 0% { transform: translateX(-110%) } 100% { transform: translateX(360%) } }
                @media (prefers-reduced-motion: reduce) {
                    #app-splash .mark { animation: none; opacity: 1 }
                    #app-splash .bar i { animation: none; width: 100% }
                }
                /* Light mode. The volt bar-fill and both keyframes are
                   fill-role/invariant — same rule as everywhere else in the
                   storefront, see tailwind.config.js. Only the ground and the
                   bar's track need to flip. */
                [data-theme="light"] #app-splash { background: #f7f6f2; }
                [data-theme="light"] #app-splash .bar { background: rgba(11,11,11,.12); }
                /* Logo swap: two stacked images, not a JS src swap — this
                   whole block is inline specifically so it resolves before
                   any JS bundle loads, and the attribute selector already
                   governs everything else here. logo-mark.png is white and
                   invisible on the light ground; logo-mark-dark.png is its
                   ink counterpart. See CLAUDE.md's Logo section. */
                #app-splash .mark-dark { display: none; }
                [data-theme="light"] #app-splash .mark-light { display: none; }
                [data-theme="light"] #app-splash .mark-dark { display: block; }
            </style>
            {{-- With JS disabled nothing ever removes the splash, so it would
                 sit over the page forever. Hide it up front in that case. --}}
            <noscript><style>#app-splash { display: none }</style></noscript>
        @endif

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @if ($showSplash)
            <div id="app-splash" aria-hidden="true">
                <img class="mark mark-light" src="/images/logo-mark.png" alt="">
                <img class="mark mark-dark" src="/images/logo-mark-dark.png" alt="">
                <div class="bar"><i></i></div>
            </div>
            <script>
                // Failsafe. If the bundle 404s or throws, app.jsx never runs and
                // the splash would hide a working server-rendered error. Give it
                // a hard ceiling regardless of what React does.
                setTimeout(function () {
                    var s = document.getElementById('app-splash');
                    if (s) s.classList.add('is-done');
                }, 6000);
            </script>
        @endif

        @inertia
    </body>
</html>
