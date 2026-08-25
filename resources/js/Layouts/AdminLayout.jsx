import { useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';

/**
 * Admin shell: dark sidebar + light content, ONE accent (brand blue), light
 * mode only. Deliberately NOT the storefront — this is a management tool, and
 * the loud volt/Anton treatment stays on the customer side. See the Design
 * section of CLAUDE.md.
 *
 * The sidebar is a fixed off-canvas drawer below lg and static from lg up.
 * The previous version was a plain `w-60` flex child with no mobile handling,
 * which ate 240px of a 360px phone screen — objective 9 says the system is
 * usable on mobile browsers, and staff check orders on their phones.
 */

const ICONS = {
    dashboard: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
    products: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
    orders: 'M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
};

/** Grouped so the sidebar reads as sections, not one undifferentiated list. */
const NAV_GROUPS = [
    {
        label: 'Overview',
        items: [{ name: 'Dashboard', route: 'admin.dashboard', icon: 'dashboard' }],
    },
    {
        label: 'Catalogue',
        items: [{ name: 'Products', route: 'admin.products.index', icon: 'products' }],
    },
    {
        label: 'Sales',
        items: [{ name: 'Orders', route: 'admin.orders.index', icon: 'orders' }],
    },
];

function NavIcon({ path, className }) {
    return (
        <svg
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            aria-hidden="true"
        >
            <path strokeLinecap="round" strokeLinejoin="round" d={path} />
        </svg>
    );
}

function SidebarContent({ user, onNavigate }) {
    return (
        <>
            <div className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-800 px-5">
                <img
                    src="/images/logo-mark.png"
                    alt=""
                    aria-hidden="true"
                    className="h-8 w-auto"
                />
                <span className="text-sm font-semibold tracking-tight text-white">
                    Syndicate{' '}
                    <span className="font-normal text-gray-400">Admin</span>
                </span>
            </div>

            <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
                {NAV_GROUPS.map((group) => (
                    <div key={group.label}>
                        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                            {group.label}
                        </p>
                        <div className="space-y-1">
                            {group.items.map((item) => {
                                const active =
                                    route().current(item.route) ||
                                    route().current(
                                        item.route.replace(/\.index$/, '') + '.*'
                                    );

                                return (
                                    <Link
                                        key={item.route}
                                        href={route(item.route)}
                                        onClick={onNavigate}
                                        aria-current={active ? 'page' : undefined}
                                        className={
                                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ' +
                                            (active
                                                ? 'bg-brand-600 text-white'
                                                : 'text-gray-300 hover:bg-gray-800 hover:text-white')
                                        }
                                    >
                                        <NavIcon
                                            path={ICONS[item.icon]}
                                            className="h-5 w-5 shrink-0"
                                        />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="shrink-0 border-t border-gray-800 p-3">
                <div className="flex items-center gap-3 rounded-md px-2 py-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold uppercase text-white">
                        {user.name.slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                            {user.name}
                        </p>
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                            {user.role}
                        </p>
                    </div>
                </div>

                <div className="mt-2 space-y-1">
                    <Link
                        href={route('home')}
                        onClick={onNavigate}
                        className="block rounded-md px-3 py-2 text-sm text-gray-400 transition hover:bg-gray-800 hover:text-white"
                    >
                        ← View the shop
                    </Link>
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="block w-full rounded-md px-3 py-2 text-left text-sm text-gray-400 transition hover:bg-gray-800 hover:text-white"
                    >
                        Log out
                    </Link>
                </div>
            </div>
        </>
    );
}

export default function AdminLayout({ header, actions, children }) {
    const { auth, flash } = usePage().props;
    const [open, setOpen] = useState(false);

    // Close the drawer whenever a visit completes. Without this it stays open
    // over the page the visitor just navigated to.
    useEffect(() => router.on('navigate', () => setOpen(false)), []);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile drawer */}
            <div
                className={
                    'fixed inset-0 z-40 lg:hidden ' + (open ? '' : 'pointer-events-none')
                }
            >
                <div
                    onClick={() => setOpen(false)}
                    className={
                        'absolute inset-0 bg-gray-900/60 transition-opacity ' +
                        (open ? 'opacity-100' : 'opacity-0')
                    }
                />
                <aside
                    className={
                        'absolute inset-y-0 left-0 flex w-64 flex-col bg-gray-900 transition-transform duration-200 ' +
                        (open ? 'translate-x-0' : '-translate-x-full')
                    }
                >
                    <SidebarContent user={auth.user} onNavigate={() => setOpen(false)} />
                </aside>
            </div>

            {/* Static sidebar */}
            <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-gray-900 lg:flex">
                <SidebarContent user={auth.user} />
            </aside>

            <div className="lg:pl-64">
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8">
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        aria-label="Open menu"
                        className="-ml-1 rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 lg:hidden"
                    >
                        <svg
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                            />
                        </svg>
                    </button>

                    <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-gray-900">
                        {header}
                    </h1>

                    {actions}
                </header>

                {flash?.success && (
                    <div className="mx-4 mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 sm:mx-6 lg:mx-8">
                        {flash.success}
                    </div>
                )}

                <main className="p-4 sm:p-6 lg:p-8">{children}</main>
            </div>
        </div>
    );
}
