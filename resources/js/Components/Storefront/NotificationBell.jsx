import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { router } from '@inertiajs/react';
import { useNotifications } from '@/utils/useNotifications';

/**
 * The customer's bell — updates on their own orders: payment received,
 * preparing, out for delivery, ready for pickup, completed. Same data hook
 * as the admin's bell, storefront styling (Anton labels, square corners).
 */
function BellIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
        </svg>
    );
}

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
                className="relative inline-flex items-center text-white transition-colors hover:text-volt-500 light:text-ink-900 light:hover:text-volt-800"
            >
                <BellIcon className="h-6 w-6" />
                {unread > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold text-white">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </Menu.Button>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="opacity-0 translate-y-1"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-75"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
            >
                <Menu.Items className="absolute right-0 z-50 mt-4 w-[min(20rem,calc(100vw-2rem))] origin-top-right border-2 border-white/15 bg-ink-900 shadow-2xl focus:outline-none light:border-ink-900/15 light:bg-white">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 light:border-ink-900/10">
                        <p className="font-display text-xs uppercase tracking-[0.2em] text-white light:text-ink-900">
                            Order updates
                        </p>
                        {unread > 0 && (
                            <button
                                type="button"
                                onClick={() => markRead()}
                                className="font-display text-[10px] uppercase tracking-[0.15em] text-volt-500 hover:text-white light:text-volt-800 light:hover:text-ink-900"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {items.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-white/40 light:text-ink-900/55">
                                {loaded ? 'Nothing yet — updates on your orders land here.' : 'Loading…'}
                            </p>
                        ) : (
                            items.map((n) => (
                                <Menu.Item key={n.id}>
                                    {({ active }) => (
                                        <button
                                            type="button"
                                            onClick={() => open(n)}
                                            className={
                                                'flex w-full gap-3 border-b border-white/5 px-4 py-3 text-left last:border-0 light:border-ink-900/5 ' +
                                                (active ? 'bg-white/10 light:bg-ink-900/5' : '')
                                            }
                                        >
                                            <span className="min-w-0 flex-1">
                                                <span className="flex items-baseline justify-between gap-2">
                                                    <span
                                                        className={
                                                            'truncate font-display text-xs uppercase tracking-wide ' +
                                                            (n.read
                                                                ? 'text-white/55 light:text-ink-900/60'
                                                                : 'text-white light:text-ink-900')
                                                        }
                                                    >
                                                        {n.title}
                                                    </span>
                                                    <span className="shrink-0 text-[10px] text-white/30 light:text-ink-900/45">
                                                        {n.ago}
                                                    </span>
                                                </span>
                                                <span className="mt-1 block text-xs leading-snug text-white/50 light:text-ink-900/60">
                                                    {n.message}
                                                </span>
                                            </span>
                                            {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />}
                                        </button>
                                    )}
                                </Menu.Item>
                            ))
                        )}
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
}
