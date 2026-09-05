import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import FilterTab from '@/Components/Admin/FilterTabs';
import Pagination from '@/Components/Admin/Pagination';
import IdStatusBadge from '@/Components/Admin/IdStatusBadge';

/**
 * The review queue. Pending leads because that's the only tab with work in
 * it; the others are there to look something up after the fact.
 *
 * No "All" tab, unlike Orders/Index — with every account carrying a status,
 * "all" is just the user list, which /admin/users already is.
 */
export default function Index({ users, filters, statuses, counts }) {
    const go = (status) =>
        router.get(
            route('admin.id-verifications.index', { status }),
            {},
            { preserveState: true, preserveScroll: true }
        );

    return (
        <AdminLayout header="ID verifications">
            <Head title="Admin · ID verifications" />

            <div className="mb-4 flex flex-wrap gap-1">
                {statuses.map((status) => (
                    <FilterTab
                        key={status}
                        active={filters.status === status}
                        onClick={() => go(status)}
                    >
                        <span className="capitalize">
                            {status.replace(/_/g, ' ')} ({counts[status] ?? 0})
                        </span>
                    </FilterTab>
                ))}
            </div>

            <Card className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/5 admin-light:divide-ink-900/10">
                    <thead>
                        <tr className="text-left text-xs uppercase tracking-widest text-white/40 admin-light:text-ink-900/55">
                            <th className="px-6 py-4 font-medium">Customer</th>
                            <th className="px-6 py-4 font-medium">ID type</th>
                            <th className="px-6 py-4 font-medium">Submitted</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium">Reviewed by</th>
                            <th className="px-6 py-4" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 admin-light:divide-ink-900/10">
                        {users.data.map((user) => (
                            <tr key={user.id}>
                                <td className="px-6 py-4">
                                    <p className="font-medium text-white admin-light:text-ink-900">
                                        {user.name}
                                    </p>
                                    <p className="text-xs text-white/40 admin-light:text-ink-900/55">
                                        {user.email}
                                    </p>
                                </td>
                                <td className="px-6 py-4 text-sm text-white/70 admin-light:text-ink-900/75">
                                    {user.id_type_label ?? '—'}
                                </td>
                                <td className="px-6 py-4 text-sm text-white/50 admin-light:text-ink-900/65">
                                    {user.submitted_at ?? '—'}
                                </td>
                                <td className="px-6 py-4">
                                    <IdStatusBadge status={user.status} />
                                </td>
                                <td className="px-6 py-4 text-sm text-white/50 admin-light:text-ink-900/65">
                                    {user.reviewed_by ?? '—'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <Link
                                        href={route('admin.id-verifications.show', user.id)}
                                        className="text-sm font-medium text-volt-500 hover:underline admin-light:text-volt-800"
                                    >
                                        Review →
                                    </Link>
                                </td>
                            </tr>
                        ))}

                        {users.data.length === 0 && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-6 py-12 text-center text-sm text-white/40 admin-light:text-ink-900/55"
                                >
                                    Nothing here.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </Card>

            <Pagination links={users.links} />
        </AdminLayout>
    );
}
