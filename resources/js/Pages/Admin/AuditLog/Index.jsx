import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import Pagination from '@/Components/Admin/Pagination';
import PrimaryButton from '@/Components/Admin/PrimaryButton';
import SecondaryButton, { secondaryButtonClasses } from '@/Components/Admin/SecondaryButton';
import { filterInputClasses } from '@/Components/Admin/StockFilters';
import { ArrowDownTrayIcon, ChevronRightIcon } from '@/Components/Admin/icons';
import { formatCentavos } from '@/utils/money';
import { useLiveReload } from '@/utils/useLiveReload';
import { Head, router } from '@inertiajs/react';
import { Fragment, useState } from 'react';

/** Colour per kind of action — red for the things worth a second look. */
const GROUP_TONES = {
    auth: 'bg-white/[0.06] text-white/60 admin-light:bg-ink-900/[0.06] admin-light:text-ink-900/60',
    product: 'bg-blue-500/10 text-blue-400 admin-light:text-blue-700',
    variant: 'bg-amber-500/10 text-amber-400 admin-light:text-amber-700',
    component: 'bg-amber-500/10 text-amber-400 admin-light:text-amber-700',
    order: 'bg-volt-500/10 text-volt-500 admin-light:text-volt-800',
    user: 'bg-purple-500/10 text-purple-400 admin-light:text-purple-700',
    report: 'bg-cyan-500/10 text-cyan-400 admin-light:text-cyan-700',
};

/** A changed value as a person would read it — centavo columns as pesos. */
function show(field, value) {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'yes' : 'no';
    if (field.endsWith('_centavos')) return formatCentavos(Number(value));
    return String(value);
}

function fieldLabel(field) {
    return field.replace(/_centavos$/, '').replace(/_/g, ' ');
}

export default function Index({ logs, filters, groups, team }) {
    const [form, setForm] = useState({ group: '', user: '', from: '', to: '', q: '', ...filters });
    const [open, setOpen] = useState(null);

    // Staff actions appear here as they happen.
    useLiveReload(['logs']);

    const apply = (e) => {
        e?.preventDefault();
        router.get(route('admin.audit-log.index'), form, { preserveState: true, preserveScroll: true });
    };

    const clear = () => {
        const empty = { group: '', user: '', from: '', to: '', q: '' };
        setForm(empty);
        router.get(route('admin.audit-log.index'), {}, { preserveState: true });
    };

    return (
        <AdminLayout header="Audit Log">
            <Head title="Admin · Audit Log" />

            <p className="max-w-3xl text-sm text-white/50 admin-light:text-ink-900/60">
                Everything the shop team does in the admin panel — sign-ins, stock and price edits, product
                changes, order actions, role changes and exports — with who, when and from where. Entries can't
                be edited or deleted.
            </p>

            <Card className="mt-4 p-4">
                <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
                    <label className="text-xs text-white/50 admin-light:text-ink-900/60">
                        Activity
                        <select value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} className={`mt-1 block pr-8 ${filterInputClasses}`}>
                            <option value="">Everything</option>
                            {Object.entries(groups).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="text-xs text-white/50 admin-light:text-ink-900/60">
                        Team member
                        <select value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} className={`mt-1 block pr-8 ${filterInputClasses}`}>
                            <option value="">Anyone</option>
                            {team.map((member) => (
                                <option key={member.id} value={member.id}>
                                    {member.name} ({member.role})
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="text-xs text-white/50 admin-light:text-ink-900/60">
                        From
                        <input type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} className={`mt-1 block ${filterInputClasses}`} />
                    </label>
                    <label className="text-xs text-white/50 admin-light:text-ink-900/60">
                        To
                        <input type="date" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} className={`mt-1 block ${filterInputClasses}`} />
                    </label>
                    <label className="text-xs text-white/50 admin-light:text-ink-900/60">
                        Search
                        <input type="search" value={form.q} placeholder="Product, order, name…" onChange={(e) => setForm({ ...form, q: e.target.value })} className={`mt-1 block w-48 ${filterInputClasses}`} />
                    </label>
                    <PrimaryButton type="submit">Filter</PrimaryButton>
                    <SecondaryButton onClick={clear}>Clear</SecondaryButton>
                    <a href={route('admin.audit-log.export', filters)} className={`ml-auto ${secondaryButtonClasses}`}>
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        Export CSV
                    </a>
                </form>
            </Card>

            <Card className="mt-4 overflow-hidden">
                {logs.data.length === 0 ? (
                    <p className="px-6 py-12 text-center text-sm text-white/40 admin-light:text-ink-900/50">
                        Nothing logged{Object.values(filters).some(Boolean) ? ' matches these filters' : ' yet'}.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-white/40 admin-light:bg-ink-900/[0.04] admin-light:text-ink-900/50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium">When</th>
                                    <th className="px-4 py-3 text-left font-medium">Who</th>
                                    <th className="px-4 py-3 text-left font-medium">What happened</th>
                                    <th className="px-4 py-3 text-left font-medium">IP</th>
                                    <th className="w-8 px-2 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10 admin-light:divide-ink-900/10">
                                {logs.data.map((log) => {
                                    const hasChanges = log.changes && Object.keys(log.changes).length > 0;
                                    const expanded = open === log.id;

                                    return (
                                        <Fragment key={log.id}>
                                            <tr
                                                onClick={() => hasChanges && setOpen(expanded ? null : log.id)}
                                                className={hasChanges ? 'cursor-pointer hover:bg-white/[0.02] admin-light:hover:bg-ink-900/[0.02]' : ''}
                                            >
                                                <td className="whitespace-nowrap px-4 py-3 align-top">
                                                    <p className="text-white/80 admin-light:text-ink-900/80">{log.at}</p>
                                                    <p className="text-xs text-white/35 admin-light:text-ink-900/45">{log.ago}</p>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 align-top">
                                                    <p className="font-medium text-white admin-light:text-ink-900">{log.actor_name}</p>
                                                    {log.actor_role && (
                                                        <p className="text-xs uppercase tracking-wide text-white/35 admin-light:text-ink-900/45">{log.actor_role}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <span className={`mr-2 inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${GROUP_TONES[log.group] ?? GROUP_TONES.auth}`}>
                                                        {groups[log.group] ?? log.group}
                                                    </span>
                                                    <span className="text-white/80 admin-light:text-ink-900/80">{log.description}</span>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 align-top font-mono text-xs text-white/40 admin-light:text-ink-900/50">
                                                    {log.ip_address ?? '—'}
                                                </td>
                                                <td className="px-2 py-3 align-top text-white/30 admin-light:text-ink-900/35">
                                                    {hasChanges && (
                                                        <ChevronRightIcon className={'h-4 w-4 transition-transform ' + (expanded ? 'rotate-90' : '')} />
                                                    )}
                                                </td>
                                            </tr>
                                            {expanded && (
                                                <tr className="bg-white/[0.02] admin-light:bg-ink-900/[0.02]">
                                                    <td colSpan={5} className="px-4 pb-4 pt-1">
                                                        <dl className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-[max-content_1fr]">
                                                            {Object.entries(log.changes).map(([field, [before, after]]) => (
                                                                <Fragment key={field}>
                                                                    <dt className="capitalize text-white/40 admin-light:text-ink-900/50">{fieldLabel(field)}</dt>
                                                                    <dd className="text-white/80 admin-light:text-ink-900/80">
                                                                        <span className="line-through decoration-red-400/60">{show(field, before)}</span>
                                                                        {' → '}
                                                                        <span className="font-semibold">{show(field, after)}</span>
                                                                    </dd>
                                                                </Fragment>
                                                            ))}
                                                        </dl>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Pagination links={logs.links} />
        </AdminLayout>
    );
}
