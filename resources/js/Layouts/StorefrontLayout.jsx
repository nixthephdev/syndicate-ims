import { Link, usePage } from '@inertiajs/react';
import StoreHeader from '@/Components/Storefront/StoreHeader';
import ThemeToggle from '@/Components/Storefront/ThemeToggle';

/**
 * Customer-facing shell: near-black ground, one loud accent (volt), heavy
 * display type. Deliberately shares NOTHING with AdminLayout — see the Design
 * section of CLAUDE.md. If you find yourself importing an admin component
 * here, that's the signal the storefront is drifting back into looking like a
 * dashboard.
 */
export default function StorefrontLayout({ children }) {
    const { auth, flash, errors } = usePage().props;
    const isStaff = ['staff', 'admin'].includes(auth?.user?.role);
    const year = new Date().getFullYear();

    // Cart and stock failures redirect back with these rather than rendering
    // an error page, so the shell is the only place they can surface.
    const banner = errors?.cart || errors?.payment;

    return (
        <div className="min-h-screen bg-ink-950 font-sans text-white selection:bg-volt-500 selection:text-ink-900 light:bg-paper light:text-ink-900">
            <StoreHeader />
            <ThemeToggle />

            {(flash?.success || banner) && (
                <div
                    role="status"
                    aria-live="polite"
                    className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8"
                >
                    {flash?.success && (
                        <p className="border-l-2 border-volt-500 bg-volt-500/10 px-4 py-3 text-sm text-volt-300 light:text-volt-800">
                            {flash.success}
                        </p>
                    )}
                    {banner && (
                        <p className="mt-3 border-l-2 border-red-500 bg-red-500/10 px-4 py-3 text-sm text-red-300 light:text-red-700">
                            {banner}
                        </p>
                    )}
                </div>
            )}

            {/* Inertia remounts this on every visit, so the entry animation
                replays per navigation. The sticky header sits outside it and
                deliberately stays put. */}
            <main className="animate-fade-up motion-reduce:animate-none">{children}</main>

            {/* Deliberately NOT theme-paired — the footer stays a permanently
                dark band in both modes. /images/logo-full.png is white-only
                and has no light-surface counterpart (producing one needs the
                ImageMagick luminance-mask pipeline documented in CLAUDE.md's
                Logo section, not a quick recolour), so a light footer would
                render an invisible logo. Common, defensible pattern for
                footers specifically — revisit if `logo-full-dark.png` is
                ever produced. */}
            <footer className="border-t-2 border-volt-500 bg-ink-900">
                <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                    <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="lg:col-span-2">
                            <img
                                src="/images/logo-full.png"
                                alt="Syndicate Supply Co."
                                className="mb-5 h-16 w-auto opacity-90"
                            />
                            <p className="font-display text-4xl uppercase leading-none tracking-tight text-white sm:text-5xl">
                                Syndicate
                                <span className="text-volt-500">.</span>
                            </p>
                            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/50">
                                Apparel and skate hardware out of Albay. Three
                                branches, built by locals, ridden by locals.
                            </p>

                            {/* Real accounts, from the shop's own Facebook
                                "Contact info" panel — not invented. Tracking
                                junk (`?fbclid=...`) stripped from the
                                Instagram/TikTok URLs the client pasted;
                                the accounts themselves are unchanged. */}
                            <div className="mt-6 flex items-center gap-3">
                                <a
                                    href="https://www.facebook.com/SSCPHP"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="Syndicate Supply Co. on Facebook"
                                    className="inline-flex h-9 w-9 items-center justify-center border border-white/15 text-white/60 transition-colors hover:border-volt-500 hover:text-volt-500"
                                >
                                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06c0 5.02 3.657 9.184 8.438 9.94v-7.03H7.898v-2.91h2.54V9.845c0-2.522 1.492-3.915 3.777-3.915 1.094 0 2.238.196 2.238.196v2.475h-1.26c-1.243 0-1.63.775-1.63 1.57v1.888h2.773l-.443 2.91h-2.33V22c4.78-.756 8.437-4.92 8.437-9.94Z" />
                                    </svg>
                                </a>
                                <a
                                    href="https://www.instagram.com/syndicate_supplyco"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="Syndicate Supply Co. on Instagram"
                                    className="inline-flex h-9 w-9 items-center justify-center border border-white/15 text-white/60 transition-colors hover:border-volt-500 hover:text-volt-500"
                                >
                                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M12 2c-2.716 0-3.056.012-4.123.06-1.064.049-1.791.218-2.427.465a4.902 4.902 0 0 0-1.772 1.153A4.902 4.902 0 0 0 2.525 5.45c-.247.636-.416 1.363-.465 2.427C2.012 8.944 2 9.284 2 12s.012 3.056.06 4.123c.049 1.064.218 1.791.465 2.427a4.902 4.902 0 0 0 1.153 1.772 4.902 4.902 0 0 0 1.772 1.153c.636.247 1.363.416 2.427.465C8.944 21.988 9.284 22 12 22s3.056-.012 4.123-.06c1.064-.049 1.791-.218 2.427-.465a4.902 4.902 0 0 0 1.772-1.153 4.902 4.902 0 0 0 1.153-1.772c.247-.636.416-1.363.465-2.427.048-1.067.06-1.407.06-4.123s-.012-3.056-.06-4.123c-.049-1.064-.218-1.791-.465-2.427a4.902 4.902 0 0 0-1.153-1.772A4.902 4.902 0 0 0 18.55 2.525c-.636-.247-1.363-.416-2.427-.465C15.056 2.012 14.716 2 12 2Zm0 1.802c2.67 0 2.986.01 4.04.059.976.044 1.505.207 1.858.344.467.182.8.399 1.15.748.35.35.566.683.748 1.15.137.353.3.882.344 1.857.048 1.055.058 1.372.058 4.04 0 2.67-.01 2.986-.058 4.04-.044.976-.207 1.505-.344 1.858a3.1 3.1 0 0 1-.748 1.15 3.1 3.1 0 0 1-1.15.748c-.353.137-.882.3-1.857.344-1.054.048-1.371.058-4.041.058-2.67 0-2.987-.01-4.04-.058-.976-.044-1.505-.207-1.858-.344a3.1 3.1 0 0 1-1.15-.748 3.1 3.1 0 0 1-.748-1.15c-.137-.353-.3-.882-.344-1.857-.048-1.055-.058-1.372-.058-4.041 0-2.67.01-2.986.058-4.04.044-.976.207-1.505.344-1.858.182-.467.399-.8.748-1.15.35-.35.683-.566 1.15-.748.353-.137.882-.3 1.857-.344 1.055-.048 1.372-.059 4.041-.059ZM12 6.865A5.135 5.135 0 1 0 12 17.135 5.135 5.135 0 0 0 12 6.865Zm0 8.468a3.333 3.333 0 1 1 0-6.666 3.333 3.333 0 0 1 0 6.666Zm6.538-8.671a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Z" />
                                    </svg>
                                </a>
                                <a
                                    href="https://www.tiktok.com/@syndicatesupplycoph"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="Syndicate Supply Co. on TikTok"
                                    className="inline-flex h-9 w-9 items-center justify-center border border-white/15 text-white/60 transition-colors hover:border-volt-500 hover:text-volt-500"
                                >
                                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M16.6 5.82c-.9-.98-1.4-2.26-1.4-3.57h-3.03v13.6a3.06 3.06 0 0 1-5.3 2.1 3.06 3.06 0 0 1 2.24-5.14c.31 0 .6.05.88.13V9.9a6.09 6.09 0 0 0-.88-.06A6.09 6.09 0 0 0 3 15.94 6.09 6.09 0 0 0 9.09 22a6.09 6.09 0 0 0 6.09-6.09V8.65a9.03 9.03 0 0 0 4.82 1.4V7.02a5.5 5.5 0 0 1-3.4-1.2Z" />
                                    </svg>
                                </a>
                                <a
                                    href="mailto:syndicatesupplyco63@gmail.com"
                                    aria-label="Email Syndicate Supply Co."
                                    className="inline-flex h-9 w-9 items-center justify-center border border-white/15 text-white/60 transition-colors hover:border-volt-500 hover:text-volt-500"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0-.414.336-.75.75-.75h18c.414 0 .75.336.75.75v10.5a.75.75 0 0 1-.75.75H3a.75.75 0 0 1-.75-.75V6.75Z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m3 7 8.4 6.3a1 1 0 0 0 1.2 0L21 7" />
                                    </svg>
                                </a>
                            </div>
                        </div>

                        <div>
                            <p className="font-display text-xs uppercase tracking-[0.25em] text-volt-500">
                                Shop
                            </p>
                            <ul className="mt-4 space-y-2 text-sm text-white/60">
                                <li>Decks &amp; completes</li>
                                <li>Wheels &amp; trucks</li>
                                <li>Tees &amp; hoodies</li>
                                <li>Caps &amp; accessories</li>
                            </ul>
                        </div>

                        <div>
                            <p className="font-display text-xs uppercase tracking-[0.25em] text-volt-500">
                                Visit
                            </p>
                            {/* Three branches, as given by the shop. Real
                                addresses — do not edit to fit the layout. */}
                            <ul className="mt-4 space-y-4 text-sm text-white/60">
                                <li>
                                    <span className="block text-xs uppercase tracking-[0.15em] text-volt-500">
                                        Tagas · Main branch
                                    </span>
                                    Purok 1, Tagas, Daraga,
                                    <br />
                                    4501 Albay
                                    {/* From the same Google listing as the
                                        address — not confirmed to also reach
                                        Peñaranda or Rawis, so it sits under
                                        Tagas only rather than as a shop-wide
                                        number. */}
                                    <a
                                        href="tel:+639482113209"
                                        className="mt-1 block text-white/40 transition-colors hover:text-volt-500"
                                    >
                                        0948 211 3209
                                    </a>
                                </li>
                                <li>
                                    <span className="block text-xs uppercase tracking-[0.15em] text-white/35">
                                        Peñaranda
                                    </span>
                                    Brgy. 33 PNR, Peñaranda St.,
                                    <br />
                                    Legazpi City
                                </li>
                                <li>
                                    <span className="block text-xs uppercase tracking-[0.15em] text-white/35">
                                        Rawis
                                    </span>
                                    Pagasa, Rawis,
                                    <br />
                                    Legazpi City
                                </li>
                                {isStaff && (
                                    <li className="pt-2">
                                        <Link
                                            href={route('admin.dashboard')}
                                            className="font-display uppercase tracking-[0.2em] text-volt-500 hover:text-white"
                                        >
                                            Admin panel →
                                        </Link>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>

                    <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs uppercase tracking-[0.2em] text-white/30 sm:flex-row sm:items-center sm:justify-between">
                        <p>© {year} Syndicate Supply Co.</p>
                        <p>Ride safe. Wear a helmet.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
