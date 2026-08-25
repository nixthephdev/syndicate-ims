import './bootstrap';
import '../css/app.css';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';

const appName = window.document.getElementsByTagName('title')[0]?.innerText || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob('./Pages/**/*.jsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);

        // Dismiss the boot splash (rendered by app.blade.php on customer-facing
        // pages only). requestAnimationFrame waits for the first paint of the
        // real page — removing it on render() alone can uncover an empty frame.
        // The element also carries a 6s failsafe timeout of its own.
        const splash = document.getElementById('app-splash');
        if (splash) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    splash.classList.add('is-done');
                    // Fully remove it so it can never trap clicks.
                    setTimeout(() => splash.remove(), 400);
                });
            });
        }
    },
    progress: {
        // Volt, matching the storefront. This bar is the one chrome element
        // shared with the admin — it is 3px and transient, which is a fair
        // trade against maintaining two progress bars.
        color: '#ccff00',
        showSpinner: false,
        // Below ~250ms a bar flashing in and out reads as a glitch. Navigations
        // faster than this get no indicator at all, which is correct.
        delay: 250,
    },
});
