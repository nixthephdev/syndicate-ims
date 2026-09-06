import { Fragment } from 'react';
import { Link } from '@inertiajs/react';
import { Menu, Transition } from '@headlessui/react';

function ChevronIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
    );
}

/** Shared classes for one menu row — `active` is headlessui's own
 * keyboard/hover highlight state, not the app's route-active state. */
function itemClasses(active, danger = false) {
    const base = 'block w-full px-4 py-2.5 text-left font-display text-xs uppercase tracking-[0.15em] transition-colors';
    const tone = danger
        ? 'text-red-400 light:text-red-700'
        : 'text-white light:text-ink-900';
    const bg = active ? 'bg-white/10 light:bg-ink-900/5' : '';
    return `${base} ${tone} ${bg}`;
}

/**
 * Logged-in account dropdown — replaces the old inline "Orders · Name · Log
 * out" link row. Sits after the cart icon in StoreHeader (desktop only; the
 * mobile drawer keeps its own flat link list, which is already the
 * touch-appropriate pattern and doesn't need a popover).
 *
 * "Profile settings" is the existing Breeze `profile.edit` page
 * (Pages/Profile/Edit.jsx) — password/email changes already live there via
 * its UpdateProfileInformationForm/UpdatePasswordForm partials, so this menu
 * doesn't need new pages, just a real entry point to what already exists.
 */
export default function AccountMenu({ user }) {
    const isStaff = ['staff', 'admin'].includes(user?.role);

    return (
        <Menu as="div" className="relative">
            <Menu.Button className="flex items-center gap-2 text-white transition-colors hover:text-volt-500 light:text-ink-900 light:hover:text-volt-800">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-volt-500 font-display text-xs font-extrabold uppercase text-ink-900">
                    {user.name.charAt(0)}
                </span>
                <span className="font-display text-sm uppercase tracking-[0.2em]">
                    {user.name.split(' ')[0]}
                </span>
                <ChevronIcon className="h-3.5 w-3.5" />
            </Menu.Button>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-150"
                enterFrom="opacity-0 -translate-y-1"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 -translate-y-1"
            >
                <Menu.Items className="absolute right-0 z-50 mt-3 w-60 origin-top-right border-2 border-white/10 bg-ink-900 py-2 shadow-2xl focus:outline-none light:border-ink-900/10 light:bg-paper-panel">
                    <div className="border-b border-white/10 px-4 py-3 light:border-ink-900/10">
                        <p className="truncate font-display text-sm uppercase tracking-wide text-white light:text-ink-900">
                            {user.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-white/40 light:text-ink-900/55">
                            {user.email}
                        </p>
                    </div>

                    <div className="py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <Link href={route('dashboard')} className={itemClasses(active)}>
                                    Dashboard
                                </Link>
                            )}
                        </Menu.Item>
                        <Menu.Item>
                            {({ active }) => (
                                <Link href={route('orders.index')} className={itemClasses(active)}>
                                    Orders
                                </Link>
                            )}
                        </Menu.Item>
                        {/* Verification blocks nothing, so there is no prompt
                            anywhere pushing customers to it — without this
                            and the Account page card, the page has no route
                            in at all. Staff are shop accounts, not buyers. */}
                        {!isStaff && (
                            <Menu.Item>
                                {({ active }) => (
                                    <Link href={route('verify-id.create')} className={itemClasses(active)}>
                                        Verify ID
                                    </Link>
                                )}
                            </Menu.Item>
                        )}
                        <Menu.Item>
                            {({ active }) => (
                                <Link href={route('profile.edit')} className={itemClasses(active)}>
                                    Profile settings
                                </Link>
                            )}
                        </Menu.Item>
                        {isStaff && (
                            <Menu.Item>
                                {({ active }) => (
                                    <Link href={route('admin.dashboard')} className={itemClasses(active)}>
                                        Admin panel
                                    </Link>
                                )}
                            </Menu.Item>
                        )}
                    </div>

                    <div className="my-1 h-px bg-white/10 light:bg-ink-900/10" />

                    <div className="py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <Link href={route('logout')} method="post" as="button" className={itemClasses(active, true)}>
                                    Log out
                                </Link>
                            )}
                        </Menu.Item>
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
}
