import { Head } from '@inertiajs/react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';

/**
 * Real branches only — same three confirmed by the client that the footer
 * already lists (see CLAUDE.md). `mapQuery` feeds Google's no-API-key embed
 * (`/maps?q=...&output=embed`), so the pin comes from Google resolving the
 * real address text, not a hand-picked lat/long this project doesn't have.
 */
const BRANCHES = [
    {
        name: 'Tagas',
        tag: 'Main branch',
        address: 'Purok 1, Tagas, Daraga, 4501 Albay',
        mapQuery: 'Purok 1, Tagas, Daraga, 4501 Albay, Philippines',
        phone: '0948 211 3209',
        tel: '+639482113209',
    },
    {
        name: 'Peñaranda',
        address: 'Brgy. 33 PNR, Peñaranda St., Legazpi City',
        mapQuery: 'Brgy. 33 PNR, Peñaranda St., Legazpi City, Philippines',
    },
    {
        name: 'Rawis',
        address: 'Pagasa, Rawis, Legazpi City',
        mapQuery: 'Pagasa, Rawis, Legazpi City, Philippines',
    },
];

function BranchCard({ branch }) {
    return (
        <div className="border-2 border-white/10 light:border-ink-900/10">
            <div className="aspect-[4/3] w-full border-b-2 border-white/10 light:border-ink-900/10">
                <iframe
                    title={`Map — ${branch.name}`}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(branch.mapQuery)}&output=embed`}
                    width="100%"
                    height="100%"
                    style={{ border: 0, filter: 'grayscale(0.3) contrast(1.05)' }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                />
            </div>

            <div className="p-6">
                <p className="flex items-baseline gap-2 font-display text-lg uppercase tracking-wide text-white light:text-ink-900">
                    {branch.name}
                    {branch.tag && (
                        <span className="font-display text-xs uppercase tracking-[0.15em] text-volt-500 light:text-volt-800">
                            {branch.tag}
                        </span>
                    )}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/60 light:text-ink-900/75">
                    {branch.address}
                </p>
                {branch.tel && (
                    <a
                        href={`tel:${branch.tel}`}
                        className="mt-3 inline-block font-display text-sm uppercase tracking-[0.15em] text-white/50 transition-colors hover:text-volt-500 light:text-ink-900/60 light:hover:text-volt-800"
                    >
                        {branch.phone}
                    </a>
                )}
            </div>
        </div>
    );
}

export default function Contact() {
    return (
        <StorefrontLayout>
            <Head title="Contact" />

            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
                <p className="flex items-center gap-3 font-display text-xs uppercase tracking-[0.35em] text-volt-500 light:text-volt-800">
                    <span className="h-px w-8 bg-volt-500" />
                    Get in touch
                </p>
                <h1 className="mt-4 font-display text-[clamp(2.5rem,7vw,4.5rem)] uppercase leading-[0.9] tracking-tighter text-white light:text-ink-900">
                    Contact
                </h1>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-white/60 light:text-ink-900/75">
                    Three branches around Legazpi and Daraga. Drop by, call
                    the main branch, or reach us online — same shop either
                    way.
                </p>

                {/* ── Branches ─────────────────────────────────────────── */}
                <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {BRANCHES.map((branch) => (
                        <BranchCard key={branch.name} branch={branch} />
                    ))}
                </div>

                {/* ── Reach us online ──────────────────────────────────── */}
                <div className="mt-16 border-t border-white/10 pt-12 light:border-ink-900/10">
                    <p className="font-display text-xs uppercase tracking-[0.25em] text-volt-500 light:text-volt-800">
                        Reach us online
                    </p>
                    <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-4 text-sm">
                        <a
                            href="mailto:syndicatesupplyco63@gmail.com"
                            className="text-white/70 transition-colors hover:text-volt-500 light:text-ink-900/80 light:hover:text-volt-800"
                        >
                            syndicatesupplyco63@gmail.com
                        </a>
                        <a
                            href="https://www.facebook.com/SSCPHP"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/70 transition-colors hover:text-volt-500 light:text-ink-900/80 light:hover:text-volt-800"
                        >
                            Facebook
                        </a>
                        <a
                            href="https://www.instagram.com/syndicate_supplyco"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/70 transition-colors hover:text-volt-500 light:text-ink-900/80 light:hover:text-volt-800"
                        >
                            Instagram
                        </a>
                        <a
                            href="https://www.tiktok.com/@syndicatesupplycoph"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/70 transition-colors hover:text-volt-500 light:text-ink-900/80 light:hover:text-volt-800"
                        >
                            TikTok
                        </a>
                    </div>
                </div>

                {/* ── FAQ — deliberately a placeholder, not filled with
                    invented questions/answers no one asked. ─────────────── */}
                <div className="mt-16 border-t border-white/10 pt-12 light:border-ink-900/10">
                    <p className="font-display text-xs uppercase tracking-[0.25em] text-volt-500 light:text-volt-800">
                        Frequently asked questions
                    </p>
                    <div className="mt-5 border-2 border-dashed border-white/15 px-6 py-10 text-center light:border-ink-900/15">
                        <p className="font-display text-sm uppercase tracking-[0.15em] text-white/40 light:text-ink-900/55">
                            Coming soon
                        </p>
                        <p className="mx-auto mt-2 max-w-md text-sm text-white/40 light:text-ink-900/55">
                            We're putting together answers to the questions
                            we actually get asked most. Check back soon, or
                            reach out directly using the details above.
                        </p>
                    </div>
                </div>
            </div>
        </StorefrontLayout>
    );
}
