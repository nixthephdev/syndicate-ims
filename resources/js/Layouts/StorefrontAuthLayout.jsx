import { Link } from '@inertiajs/react';
import ThemeToggle from '@/Components/Storefront/ThemeToggle';

/**
 * Auth shell for the storefront (login / register).
 *
 * Split screen: the shop's own doorway photo on the left, form on the right.
 * The photo is the strongest brand asset available and does the job a logo on
 * a grey card cannot — it shows the customer a real shop before asking them
 * for a password.
 *
 * Below lg the photo panel is dropped rather than stacked. On a phone it would
 * push the form under the fold, and the form is the entire point of the page.
 *
 * Deliberately separate from Breeze's GuestLayout, which is still used by the
 * password-reset pages and is light-surface.
 */
export default function StorefrontAuthLayout({ eyebrow, title, intro, children, footer }) {
    return (
        <div className="min-h-screen bg-ink-950 font-sans text-white selection:bg-volt-500 selection:text-ink-900 light:bg-paper light:text-ink-900 lg:grid lg:grid-cols-2">
            <ThemeToggle />

            {/* ── Brand panel ──────────────────────────────────────────── */}
            {/* Deliberately NOT theme-paired, same reasoning as
                StorefrontLayout's footer: this is a photo with a dark scrim
                (tuned specifically for white text on top), not a flat
                surface the light palette was designed for, and it's
                decorative branding rather than content someone needs to
                read in their preferred theme. Desktop-only (lg:block),
                which is also why the mobile logo below exists separately. */}
            <aside className="relative hidden lg:block">
                <img
                    src="/images/lookbook/storefront.jpg"
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover"
                />
                {/* Two overlays: a flat wash for contrast, plus a bottom ramp
                    so the caption never sits on a busy part of the photo. */}
                <div className="absolute inset-0 bg-ink-950/70" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/40" />

                <div className="relative flex h-full flex-col justify-between p-12">
                    <Link href="/" className="flex items-center gap-3">
                        <img
                            src="/images/logo-mark.png"
                            alt=""
                            aria-hidden="true"
                            className="h-10 w-auto"
                        />
                        <span className="font-display text-3xl uppercase leading-none tracking-tight text-white">
                            Syndicate
                        </span>
                    </Link>

                    <div>
                        <p className="font-display text-[clamp(2.5rem,4vw,4rem)] uppercase leading-[0.9] tracking-tighter text-white">
                            Build your style.
                            <br />
                            <span className="text-volt-500">Ride safe.</span>
                        </p>
                        <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/50">
                            An account keeps your builds, your cart and your
                            order history in one place.
                        </p>
                    </div>
                </div>
            </aside>

            {/* ── Form panel ───────────────────────────────────────────── */}
            <main className="flex min-h-screen flex-col justify-center px-6 py-12 sm:px-12 lg:min-h-0 lg:px-16">
                <div className="mx-auto w-full max-w-md animate-fade-up motion-reduce:animate-none">
                    {/* Small screens lose the brand panel, so the mark comes
                        back here — otherwise the page has no branding at all. */}
                    <Link
                        href="/"
                        className="mb-10 inline-flex items-center gap-3 lg:hidden"
                    >
                        <img
                            src="/images/logo-mark.png"
                            alt=""
                            aria-hidden="true"
                            className="h-8 w-auto light:hidden"
                        />
                        <img
                            src="/images/logo-mark-dark.png"
                            alt=""
                            aria-hidden="true"
                            className="hidden h-8 w-auto light:block"
                        />
                        <span className="font-display text-2xl uppercase leading-none tracking-tight text-white light:text-ink-900">
                            Syndicate
                        </span>
                    </Link>

                    {eyebrow && (
                        <p className="flex items-center gap-3 font-display text-xs uppercase tracking-[0.35em] text-volt-500 light:text-volt-800">
                            <span className="h-px w-8 bg-volt-500" />
                            {eyebrow}
                        </p>
                    )}

                    <h1 className="mt-5 font-display text-[clamp(2.25rem,7vw,3.5rem)] uppercase leading-[0.9] tracking-tighter text-white light:text-ink-900">
                        {title}
                    </h1>

                    {intro && (
                        <p className="mt-4 text-sm leading-relaxed text-white/50 light:text-ink-900/65">
                            {intro}
                        </p>
                    )}

                    <div className="mt-10">{children}</div>

                    {footer && (
                        <div className="mt-8 border-t border-white/10 pt-6 text-sm text-white/50 light:border-ink-900/10 light:text-ink-900/65">
                            {footer}
                        </div>
                    )}

                    <Link
                        href="/"
                        className="mt-10 inline-block font-display text-xs uppercase tracking-[0.25em] text-white/30 transition-colors hover:text-volt-500 light:text-ink-900/45 light:hover:text-volt-800"
                    >
                        ← Back to the shop
                    </Link>
                </div>
            </main>
        </div>
    );
}
