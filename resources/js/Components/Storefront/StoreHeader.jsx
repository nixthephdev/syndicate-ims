import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import AccountMenu from './AccountMenu';

/**
 * Storefront nav. Nothing here is shared with AdminLayout on purpose — the
 * shop is a brand surface, the admin is a tool.
 *
 * Routes that don't exist yet (Customize ships in Phase 5, cart in Phase 4)
 * render as a dimmed "soon" chip instead of a link. Ziggy's route().has()
 * means each one upgrades to a real link the moment the route is registered
 * in routes/web.php — no edit needed here.
 */
const NAV = [
    { label: 'Home', route: 'home' },
    { label: 'Shop', route: 'shop.index' },
    { label: 'Customize', route: 'customize' },
    { label: 'Contact', route: 'contact' },
];

function CartIcon({ className }) {
    return (
        <svg
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            aria-hidden="true"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
            />
        </svg>
    );
}

function Wordmark() {
    return (
        <Link href="/" className="group flex items-center gap-3">
            {/* Two marks, CSS-toggled: logo-mark.png is white-on-transparent
                (invisible on a light ground), logo-mark-dark.png is its ink
                counterpart. See CLAUDE.md's Logo section. */}
            <img
                src="/images/logo-mark.png"
                alt=""
                aria-hidden="true"
                className="h-8 w-auto shrink-0 transition-transform duration-300 group-hover:-rotate-6 sm:h-10 light:hidden"
            />
            <img
                src="/images/logo-mark-dark.png"
                alt=""
                aria-hidden="true"
                className="hidden h-8 w-auto shrink-0 transition-transform duration-300 group-hover:-rotate-6 sm:h-10 light:block"
            />
            <span className="flex flex-col leading-none">
                <span className="font-display text-2xl uppercase leading-none tracking-tight text-white transition-colors group-hover:text-volt-500 light:text-ink-900 light:group-hover:text-volt-800 sm:text-3xl">
                    Syndicate
                </span>
                <span className="mt-1 hidden text-[10px] font-bold uppercase tracking-[0.35em] text-white/40 light:text-ink-900/55 sm:inline">
                    Supply Co.
                </span>
            </span>
        </Link>
    );
}

export default function StoreHeader() {
    const { auth } = usePage().props;
    const [open, setOpen] = useState(false);
    const user = auth?.user;
    const cartCount = usePage().props.cart?.count ?? 0;

    const linkBase =
        'font-display text-sm uppercase tracking-[0.2em] transition-colors';

    const navLink = (item) => {
        if (!route().has(item.route)) {
            return (
                <span
                    key={item.label}
                    title="Coming soon"
                    className={`${linkBase} cursor-not-allowed text-white/30 light:text-ink-900/45`}
                >
                    {item.label}
                    <sup className="ml-1 text-[9px] tracking-normal text-volt-500/60 light:text-volt-800/70">
                        soon
                    </sup>
                </span>
            );
        }

        const active = route().current(item.route);

        return (
            <Link
                key={item.label}
                href={route(item.route)}
                className={`${linkBase} ${
                    active
                        ? 'text-volt-500 light:text-volt-800'
                        : 'text-white hover:text-volt-500 light:text-ink-900 light:hover:text-volt-800'
                }`}
            >
                {item.label}
            </Link>
        );
    };

    const cartHref = route().has('cart.index') ? route('cart.index') : null;

    const cartButton = (
        <span className="relative inline-flex items-center">
            <CartIcon className="h-6 w-6" />
            <span className="absolute -right-2 -top-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-volt-500 px-1 text-[10px] font-extrabold text-ink-900">
                {cartCount}
            </span>
        </span>
    );

    return (
        <header className="sticky top-0 z-50 border-b-2 border-volt-500 bg-ink-950/95 backdrop-blur supports-[backdrop-filter]:bg-ink-950/80 light:bg-paper/95 light:supports-[backdrop-filter]:bg-paper/80">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
                <Wordmark />

                {/* Desktop nav */}
                <nav className="hidden items-center gap-10 md:flex">
                    {NAV.map(navLink)}
                </nav>

                <div className="flex items-center gap-4 sm:gap-6">
                    {/* Guest auth links — logged-in users get the account
                        dropdown instead, placed after the cart (see below). */}
                    {!user && (
                        <div className="hidden items-center gap-4 md:flex">
                            <Link
                                href={route('login')}
                                className={`${linkBase} text-white hover:text-volt-500 light:text-ink-900 light:hover:text-volt-800`}
                            >
                                Login
                            </Link>
                            <Link
                                href={route('register')}
                                className="bg-volt-500 px-4 py-2 font-display text-sm uppercase tracking-[0.2em] text-ink-900 transition-transform hover:-translate-y-0.5 hover:bg-white light:hover:bg-ink-900 light:hover:text-white"
                            >
                                Sign up
                            </Link>
                        </div>
                    )}

                    {cartHref ? (
                        <Link
                            href={cartHref}
                            aria-label={`Cart, ${cartCount} items`}
                            className="text-white transition-colors hover:text-volt-500 light:text-ink-900 light:hover:text-volt-800"
                        >
                            {cartButton}
                        </Link>
                    ) : (
                        <span
                            title="Cart opens in Phase 4"
                            aria-label="Cart, empty"
                            className="cursor-not-allowed text-white/40 light:text-ink-900/55"
                        >
                            {cartButton}
                        </span>
                    )}

                    {user && (
                        <div className="hidden md:block">
                            <AccountMenu user={user} />
                        </div>
                    )}

                    {/* Burger */}
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        aria-expanded={open}
                        aria-label="Toggle menu"
                        className="text-white light:text-ink-900 md:hidden"
                    >
                        <svg
                            className="h-7 w-7"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2.5"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                d={
                                    open
                                        ? 'M6 18 18 6M6 6l12 12'
                                        : 'M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5'
                                }
                            />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile drawer */}
            {open && (
                <div className="border-t border-white/10 bg-ink-950 light:border-ink-900/10 light:bg-paper md:hidden">
                    <nav className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 text-xl sm:px-6">
                        {NAV.map(navLink)}
                        <div className="h-px bg-white/10 light:bg-ink-900/10" />
                        {user ? (
                            <>
                                <Link
                                    href={route('dashboard')}
                                    className={`${linkBase} text-white light:text-ink-900`}
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    href={route('orders.index')}
                                    className={`${linkBase} text-white light:text-ink-900`}
                                >
                                    Orders
                                </Link>
                                <Link
                                    href={route('profile.edit')}
                                    className={`${linkBase} text-white light:text-ink-900`}
                                >
                                    Profile settings
                                </Link>
                                <Link
                                    href={route('logout')}
                                    method="post"
                                    as="button"
                                    className={`${linkBase} text-left text-white/50 light:text-ink-900/65`}
                                >
                                    Log out
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link
                                    href={route('login')}
                                    className={`${linkBase} text-white light:text-ink-900`}
                                >
                                    Login
                                </Link>
                                <Link
                                    href={route('register')}
                                    className="bg-volt-500 px-4 py-3 text-center font-display text-sm uppercase tracking-[0.2em] text-ink-900"
                                >
                                    Sign up
                                </Link>
                            </>
                        )}
                    </nav>
                </div>
            )}
        </header>
    );
}
