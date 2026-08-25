import { Link, usePage } from '@inertiajs/react';
import StoreHeader from '@/Components/Storefront/StoreHeader';

/**
 * Customer-facing shell: near-black ground, one loud accent (volt), heavy
 * display type. Deliberately shares NOTHING with AdminLayout — see the Design
 * section of CLAUDE.md. If you find yourself importing an admin component
 * here, that's the signal the storefront is drifting back into looking like a
 * dashboard.
 */
export default function StorefrontLayout({ children }) {
    const { auth } = usePage().props;
    const isStaff = ['staff', 'admin'].includes(auth?.user?.role);
    const year = new Date().getFullYear();

    return (
        <div className="min-h-screen bg-ink-950 font-sans text-white selection:bg-volt-500 selection:text-ink-900">
            <StoreHeader />

            {/* Inertia remounts this on every visit, so the entry animation
                replays per navigation. The sticky header sits outside it and
                deliberately stays put. */}
            <main className="animate-fade-up motion-reduce:animate-none">{children}</main>

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
                                Apparel and skate hardware out of Legazpi City,
                                Albay. Built by locals, ridden by locals.
                            </p>
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
                            <ul className="mt-4 space-y-2 text-sm text-white/60">
                                <li>Legazpi City, Albay</li>
                                <li>Mon–Sat · 10:00–19:00</li>
                                <li>GCash accepted</li>
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
