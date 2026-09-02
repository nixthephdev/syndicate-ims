import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';

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

    const tab = (active) =>
        'px-3 py-1.5 rounded-md text-sm font-medium transition ' +
        (active ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100');

    return (
        <AdminLayout header="Users">
            <Head title="Admin · Users" />

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-1">
                    <button type="button" onClick={() => go({ q: filters.q || undefined })} className={tab(!filters.role)}>
                        All
                    </button>
                    {roles.map((role) => (
                        <button key={role} type="button" onClick={() => go({ ...filters, role })} className={tab(filters.role === role)}>
                            {ROLE_LABELS[role]}
                        </button>
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
                        className="w-64 rounded-md border-gray-300 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500"
                    />
                    <button
                        type="submit"
                        className="rounded-md bg-gray-800 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-gray-700"
                    >
                        Search
                    </button>
                </form>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {['Name', 'Role', 'Orders', 'Status', 'Joined', ''].map((heading, i) => (
                                <th key={i} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    {heading}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {users.data.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                                    No users match this view.
                                </td>
                            </tr>
                        )}

                        {users.data.map((user) => {
                            const isSelf = user.id === auth.user.id;

                            return (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm">
                                        <span className="block font-medium text-gray-900">
                                            {user.name}
                                            {isSelf && <span className="ml-2 text-xs font-normal text-gray-400">(you)</span>}
                                        </span>
                                        <span className="text-xs text-gray-500">{user.email}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={user.role}
                                            disabled={isSelf}
                                            onChange={(e) => changeRole(user, e.target.value)}
                                            className="rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-400"
                                        >
                                            {roles.map((role) => (
                                                <option key={role} value={role}>
                                                    {ROLE_LABELS[role]}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{user.orders_count}</td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={
                                                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ' +
                                                (user.is_active
                                                    ? 'bg-green-50 text-green-700 ring-green-600/20'
                                                    : 'bg-gray-100 text-gray-500 ring-gray-500/20')
                                            }
                                        >
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{user.joined_at}</td>
                                    <td className="px-6 py-4 text-right text-sm">
                                        {!isSelf && (
                                            <button
                                                onClick={() => toggleStatus(user)}
                                                className={user.is_active ? 'text-red-600 hover:text-red-700' : 'text-brand-600 hover:text-brand-700'}
                                            >
                                                {user.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {users.links.length > 3 && (
                <nav className="mt-4 flex flex-wrap gap-1">
                    {users.links.map((link, i) => (
                        <Link
                            key={i}
                            href={link.url ?? '#'}
                            preserveScroll
                            className={
                                'rounded-md px-3 py-1.5 text-sm transition ' +
                                (link.active ? 'bg-brand-600 text-white' : link.url ? 'text-gray-600 hover:bg-gray-100' : 'cursor-default text-gray-300')
                            }
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </nav>
            )}
        </AdminLayout>
    );
}
