import { Link, usePage } from '@inertiajs/react';

const navItems = [
    { name: 'Dashboard', href: 'admin.dashboard' },
    { name: 'Products', href: 'admin.products.index' },
    { name: 'Orders', href: 'admin.orders.index' },
];

/**
 * Dark sidebar + light content. Deliberately not styled like the storefront
 * will eventually be — this is a management tool first, one accent colour,
 * no attempt at "brand energy." See DECISIONS.md.
 */
export default function AdminLayout({ header, children }) {
    const { auth, flash } = usePage().props;

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <aside className="w-60 shrink-0 bg-gray-900 text-gray-300 flex flex-col">
                <div className="h-16 flex items-center px-6 border-b border-gray-800">
                    <Link href="/" className="text-white font-semibold tracking-tight">
                        Syndicate <span className="text-brand-400">Admin</span>
                    </Link>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1">
                    {navItems.map((item) => {
                        const active = route().current(item.href) || route().current(item.href + '.*');

                        return (
                            <Link
                                key={item.href}
                                href={route(item.href)}
                                className={
                                    'block rounded-md px-3 py-2 text-sm font-medium transition ' +
                                    (active
                                        ? 'bg-brand-600 text-white'
                                        : 'text-gray-300 hover:bg-gray-800 hover:text-white')
                                }
                            >
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="px-3 py-4 border-t border-gray-800 space-y-1">
                    <div className="px-3 py-1 text-xs text-gray-500">
                        {auth.user.name} · <span className="uppercase">{auth.user.role}</span>
                    </div>
                    <Link
                        href={route('dashboard')}
                        className="block rounded-md px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
                    >
                        ← Customer view
                    </Link>
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="block w-full text-left rounded-md px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
                    >
                        Log out
                    </Link>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0">
                {header && (
                    <header className="bg-white border-b border-gray-200 h-16 flex items-center px-8">
                        <h1 className="text-lg font-semibold text-gray-900">{header}</h1>
                    </header>
                )}

                {flash?.success && (
                    <div className="mx-8 mt-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
                        {flash.success}
                    </div>
                )}

                <main className="flex-1 p-8">{children}</main>
            </div>
        </div>
    );
}
