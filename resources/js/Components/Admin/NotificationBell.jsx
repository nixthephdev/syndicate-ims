import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { router } from '@inertiajs/react';
import { useNotifications } from '@/utils/useNotifications';
import { BellIcon, CubeIcon, ListBulletIcon } from '@/Components/Admin/icons';

/**
 * Topbar bell — new orders, payments, customer cancellations, and items
 * running low or out (client, 2026-10-31: "notification button for products
 * and orders"). The red dot is the client's own sketch.
 *
 * The panel is NOT portalled, unlike ConfirmDialog — it renders inside
 * AdminLayout's data-admin-theme wrapper, so admin-light: just works.
 */
export default function NotificationBell() {
    const { unread, items, loaded, markRead } = useNotifications();

    const open = (n) => {
        if (!n.read) markRead(n.id);
        if (n.url) router.visit(n.url);
    };

    return (
        <Menu as="div" className="relative">
            <Menu.Button
                aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
                title="Notifications"
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 text-white/50 transition hover:border-white/25 hover:text-white admin-light:border-ink-900/10 admin-light:text-ink-900/50 admin-light:hover:border-ink-900/25 admin-light:hover:text-ink-900"
            >
                <BellIcon className="h-4 w-4" />
                {unread > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-ink-900 admin-light:ring-white">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </Menu.Button>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
            >
                <Menu.Items className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-md border border-white/10 bg-ink-900 shadow-2xl focus:outline-none admin-light:border-ink-900/10 admin-light:bg-white">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 admin-light:border-ink-900/10">
                        <p className="font-oswald text-sm font-semibold uppercase tracking-wide text-white admin-light:text-ink-900">
                            Notifications
                        </p>
                        {unread > 0 && (
                            <button
                                type="button"
                                onClick={() => markRead()}
                                className="text-xs font-medium text-volt-500 hover:underline admin-light:text-volt-800"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[26rem] overflow-y-auto">
                        {items.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-white/40 admin-light:text-ink-900/50">
                                {loaded ? "You're all caught up." : 'Loading…'}
                            </p>
                        ) : (
                            items.map((n) => {
                                const Icon = n.kind === 'stock' ? CubeIcon : ListBulletIcon;

                                return (
                                    <Menu.Item key={n.id}>
                                        {({ active }) => (
                                            <button
                                                type="button"
                                                onClick={() => open(n)}
                                                className={
                                                    'flex w-full gap-3 border-b border-white/5 px-4 py-3 text-left last:border-0 admin-light:border-ink-900/5 ' +
                                                    (active ? 'bg-white/[0.04] admin-light:bg-ink-900/[0.04]' : '')
                                                }
                                            >
                                                <span
                                                    className={
                                                        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ' +
                                                        (n.kind === 'stock'
                                                            ? 'bg-amber-500/10 text-amber-400'
                                                            : 'bg-volt-500/10 text-volt-500 admin-light:text-volt-800')
                                                    }
                                                >
                                                    <Icon className="h-3.5 w-3.5" />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="flex items-baseline justify-between gap-2">
                                                        <span
                                                            className={
                                                                'truncate text-sm ' +
                                                                (n.read
                                                                    ? 'text-white/60 admin-light:text-ink-900/65'
                                                                    : 'font-semibold text-white admin-light:text-ink-900')
                                                            }
                                                        >
                                                            {n.title}
                                                        </span>
                                                        <span className="shrink-0 text-[11px] text-white/30 admin-light:text-ink-900/40">
                                                            {n.ago}
                                                        </span>
                                                    </span>
                                                    <span className="mt-0.5 block text-xs leading-snug text-white/45 admin-light:text-ink-900/55">
                                                        {n.message}
                                                    </span>
                                                </span>
                                                {!n.read && (
                                                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-red-500" aria-label="Unread" />
                                                )}
                                            </button>
                                        )}
                                    </Menu.Item>
                                );
                            })
                        )}
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
}
