import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import FilterTab from '@/Components/Admin/FilterTabs';
import Pagination from '@/Components/Admin/Pagination';
import PrimaryButton from '@/Components/Admin/PrimaryButton';
import { MagnifyingGlassIcon, PowerIcon } from '@/Components/Admin/icons';
import { Head, router, usePage } from '@inertiajs/react';

const ROLE_LABELS = {
    customer: 'Customer',
    staff: 'Staff',
    admin: 'Admin',
};

export default function Index({ users, filters, roles }) {
    const { auth } = usePage().props;
    const [term, setTerm] = useState(filters.q ?? '');

    const go = (params) => {
        router.get(route('admin.users.index'), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const search = (e) => {
        e.preventDefault();
        go({ ...filters, q: term || undefined });
    };

    const changeRole = (user, role) => {
        if (role === user.role) return;
        router.patch(route('admin.users.role.update', user.id), { role }, { preserveScroll: true });
    };

    const toggleStatus = (user) => {
        const verb = user.is_active ? 'Deactivate' : 'Activate';
        if (!confirm(`${verb} ${user.name}?`)) return;
        router.patch(route('admin.users.status.update', user.id), {}, { preserveScroll: true });
    };

    return (
        <AdminLayout header="Users">
            <Head title="Admin · Users" />

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-1">
                    <FilterTab active={!filters.role} onClick={() => go({ q: filters.q || undefined })}>
                        All
                    </FilterTab>
                    {roles.map((role) => (
                        <FilterTab key={role} active={filters.role === role} onClick={() => go({ ...filters, role })}>
                            {ROLE_LABELS[role]}
                        </FilterTab>
                    ))}
                </div>

                <form onSubmit={search} className="flex gap-2">
                    <label htmlFor="q" className="sr-only">
                        Search users
                    </label>
                    <input
                        id="q"
                        type="search"
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        placeholder="Name or email"
                        className="w-64 rounded-md border-white/15 bg-ink-900 text-sm text-white shadow-sm placeholder-white/30 focus:border-volt-500 focus:ring-volt-500 admin-light:border-ink-900/15 admin-light:bg-white admin-light:text-ink-900 admin-light:placeholder-ink-900/30"
                    />
                    <PrimaryButton type="submit" icon={MagnifyingGlassIcon} aria-label="Search" />
                </form>
            </div>

            <Card className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10 admin-light:divide-ink-900/10">
                    <thead className="bg-white/[0.04] admin-light:bg-ink-900/[0.04]">
                        <tr>
                            {['Name', 'Role', 'Orders', 'Status', 'Joined', ''].map((heading, i) => (
                                <th key={i} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40 admin-light:text-ink-900/50">
                                    {heading}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 admin-light:divide-ink-900/10">
                        {users.data.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-10 text-center text-sm text-white/40 admin-light:text-ink-900/50">
                                    No users match this view.
                                </td>
                            </tr>
                        )}

                        {users.data.map((user) => {
                            const isSelf = user.id === auth.user.id;

                            return (
                                <tr key={user.id} className="hover:bg-white/[0.03] admin-light:hover:bg-ink-900/[0.03]">
                                    <td className="px-6 py-4 text-sm">
                                        <span className="block font-medium text-white admin-light:text-ink-900">
                                            {user.name}
                                            {isSelf && <span className="ml-2 text-xs font-normal text-white/25 admin-light:text-ink-900/35">(you)</span>}
                                        </span>
                                        <span className="text-xs text-white/40 admin-light:text-ink-900/50">{user.email}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={user.role}
                                            disabled={isSelf}
                                            onChange={(e) => changeRole(user, e.target.value)}
                                            className="rounded-md border-white/15 bg-ink-900 text-sm text-white focus:border-volt-500 focus:ring-volt-500 disabled:bg-white/[0.04] disabled:text-white/25 admin-light:border-ink-900/15 admin-light:bg-white admin-light:text-ink-900 admin-light:disabled:bg-ink-900/[0.04] admin-light:disabled:text-ink-900/35"
                                        >
                                            {roles.map((role) => (
                                                <option key={role} value={role}>
                                                    {ROLE_LABELS[role]}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-white/50 admin-light:text-ink-900/60">{user.orders_count}</td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={
                                                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ' +
                                                (user.is_active
                                                    ? 'bg-green-500/10 text-green-400 ring-green-500/20'
                                                    : 'bg-white/[0.06] text-white/40 ring-white/10 admin-light:bg-ink-900/[0.06] admin-light:text-ink-900/50 admin-light:ring-ink-900/10')
                                            }
                                        >
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-white/50 admin-light:text-ink-900/60">{user.joined_at}</td>
                                    <td className="px-6 py-4 text-right text-sm">
                                        {!isSelf && (
                                            <button
                                                onClick={() => toggleStatus(user)}
                                                className={
                                                    'inline-flex items-center gap-1.5 ' +
                                                    (user.is_active ? 'text-red-400 hover:text-red-300' : 'text-volt-500 hover:text-volt-400 admin-light:text-volt-800 admin-light:hover:text-volt-800')
                                                }
                                            >
                                                <PowerIcon className="h-3.5 w-3.5" />
                                                {user.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </Card>

            <Pagination links={users.links} />
        </AdminLayout>
    );
}
