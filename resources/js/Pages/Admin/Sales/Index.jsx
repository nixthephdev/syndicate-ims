import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PrimaryButton from '@/Components/Admin/PrimaryButton';
import SecondaryButton, { secondaryButtonClasses } from '@/Components/Admin/SecondaryButton';
import { filterInputClasses } from '@/Components/Admin/StockFilters';
import { ArrowDownTrayIcon, PrinterIcon, TrendDownIcon, TrendUpIcon } from '@/Components/Admin/icons';
import { formatCentavos } from '@/utils/money';
import { useAdminTheme } from '@/utils/useAdminTheme';
import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

/** Same per-theme hex pairs as the Dashboard's chart — Recharts reads raw
 *  props, not Tailwind classes. One series, so volt alone is fine. */
const CHART_COLORS = {
    dark: { bar: '#ccff00', tick: '#6b6b73', grid: '#1f1f1f', tooltipBg: 'rgba(11,11,11,0.92)', tooltipBorder: '#242424', tooltipText: '#ffffff', cursor: 'rgba(255,255,255,0.04)' },
    light: { bar: '#5c7600', tick: '#8a8a8f', grid: '#ebeae3', tooltipBg: 'rgba(255,255,255,0.96)', tooltipBorder: '#e2e0d4', tooltipText: '#0b0b0b', cursor: 'rgba(11,11,11,0.04)' },
};

/** Axis labels: ₱850, ₱1.2K, ₱45K — never two ticks rounding to the same text. */
const PESO_COMPACT = new Intl.NumberFormat('en-PH', { notation: 'compact', maximumFractionDigits: 1 });

const toIso = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Quick ranges. Computed in the browser's clock, which for this shop is
 *  Manila — the same day boundaries the server uses. */
function presets() {
    const today = new Date();
    const daysAgo = (n) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - n);
    return [
        { label: '7 days', from: daysAgo(6), to: today },
        { label: '30 days', from: daysAgo(29), to: today },
        { label: '90 days', from: daysAgo(89), to: today },
        { label: 'This month', from: new Date(today.getFullYear(), today.getMonth(), 1), to: today },
        { label: 'This year', from: new Date(today.getFullYear(), 0, 1), to: today },
    ].map((p) => ({ ...p, from: toIso(p.from), to: toIso(p.to) }));
}

function change(current, previous) {
    if (!previous) return null;
    return ((current - previous) / previous) * 100;
}

function Figure({ label, value, hint, delta }) {
    const hasDelta = typeof delta === 'number' && Number.isFinite(delta);
    const up = hasDelta && delta >= 0;

    return (
        <Card className="px-5 py-4 print:border-ink-900/20">
            <p className="text-xs font-medium uppercase tracking-wider text-white/40 admin-light:text-ink-900/50">{label}</p>
            <p className="font-oswald mt-2 text-2xl font-bold text-white admin-light:text-ink-900">{value}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-white/35 admin-light:text-ink-900/45">
                {hasDelta && (
                    <span className={'inline-flex items-center gap-0.5 font-semibold ' + (up ? 'text-green-400 admin-light:text-green-700' : 'text-red-400 admin-light:text-red-600')}>
                        {up ? <TrendUpIcon className="h-3 w-3" /> : <TrendDownIcon className="h-3 w-3" />}
                        {Math.abs(delta).toFixed(0)}%
                    </span>
                )}
                {hint}
            </p>
        </Card>
    );
}

/** A two-part share as a labelled bar — apparel vs skateboard and the like. */
function Split({ title, left, right }) {
    const total = left.value + right.value;
    const pct = total ? Math.round((left.value / total) * 100) : 0;

    return (
        <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/40 admin-light:text-ink-900/50">{title}</p>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-white/[0.06] admin-light:bg-ink-900/[0.06]">
                {total > 0 && <div className="bg-volt-500 admin-light:bg-volt-800" style={{ width: `${pct}%` }} />}
            </div>
            <div className="mt-2 flex justify-between text-sm">
                <span className="text-white/70 admin-light:text-ink-900/75">
                    {left.label} <span className="text-white/40 admin-light:text-ink-900/50">· {left.display} ({total ? pct : 0}%)</span>
                </span>
                <span className="text-right text-white/70 admin-light:text-ink-900/75">
                    {right.label} <span className="text-white/40 admin-light:text-ink-900/50">· {right.display} ({total ? 100 - pct : 0}%)</span>
                </span>
            </div>
        </div>
    );
}

/** Printing: paper is white, so print the light theme whatever is on
 *  screen, then put the viewer's own theme back. */
function printReport() {
    const wrapper = document.querySelector('[data-admin-theme]');
    const before = wrapper?.getAttribute('data-admin-theme');
    wrapper?.setAttribute('data-admin-theme', 'light');
    const restore = () => {
        if (before) wrapper?.setAttribute('data-admin-theme', before);
        window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
}

export default function Index({ filters, period_label, previous_label, summary, previous, trend, top_items, split }) {
    const { theme } = useAdminTheme();
    const c = CHART_COLORS[theme];
    const [form, setForm] = useState(filters);
    // The server resolves the grouping when a preset leaves it blank — show
    // what it actually chose.
    useEffect(() => setForm(filters), [filters]);

    const apply = (next = form) => {
        setForm(next);
        router.get(route('admin.sales.index'), next, { preserveScroll: true, preserveState: true });
    };

    const exportUrl = (type) => route('admin.sales.export', { ...filters, type });
    const tickEvery = Math.max(0, Math.ceil(trend.length / 12) - 1);

    return (
        <AdminLayout header="Sales Report">
            <Head title="Admin · Sales Report" />

            {/* Controls — never printed. */}
            <Card className="p-4 print:hidden">
                <div className="flex flex-wrap gap-2">
                    {presets().map((p) => {
                        const active = p.from === filters.from && p.to === filters.to;
                        return (
                            <button
                                key={p.label}
                                type="button"
                                onClick={() => apply({ ...form, from: p.from, to: p.to, interval: '' })}
                                className={
                                    'rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ' +
                                    (active
                                        ? 'bg-volt-500 text-ink-900'
                                        : 'bg-white/[0.05] text-white/60 hover:text-white admin-light:bg-ink-900/[0.05] admin-light:text-ink-900/60 admin-light:hover:text-ink-900')
                                }
                            >
                                {p.label}
                            </button>
                        );
                    })}
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        apply();
                    }}
                    className="mt-4 flex flex-wrap items-end gap-3"
                >
                    <label className="text-xs text-white/50 admin-light:text-ink-900/60">
                        From
                        <input type="date" value={form.from} max={form.to} onChange={(e) => setForm({ ...form, from: e.target.value })} className={`mt-1 block ${filterInputClasses}`} />
                    </label>
                    <label className="text-xs text-white/50 admin-light:text-ink-900/60">
                        To
                        <input type="date" value={form.to} min={form.from} onChange={(e) => setForm({ ...form, to: e.target.value })} className={`mt-1 block ${filterInputClasses}`} />
                    </label>
                    <label className="text-xs text-white/50 admin-light:text-ink-900/60">
                        Group by
                        <select value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value })} className={`mt-1 block pr-8 ${filterInputClasses}`}>
                            <option value="day">Day</option>
                            <option value="week">Week</option>
                            <option value="month">Month</option>
                        </select>
                    </label>
                    <PrimaryButton type="submit">Show</PrimaryButton>

                    <div className="ml-auto flex flex-wrap gap-2">
                        <a href={exportUrl('trend')} className={secondaryButtonClasses}>
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            CSV · by {filters.interval}
                        </a>
                        <a href={exportUrl('lines')} className={secondaryButtonClasses}>
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            CSV · every item sold
                        </a>
                        <SecondaryButton icon={PrinterIcon} onClick={printReport}>
                            Print
                        </SecondaryButton>
                    </div>
                </form>
            </Card>

            {/* Printed heading — the screen already says this in the topbar. */}
            <div className="hidden print:block">
                <p className="font-oswald text-2xl font-bold uppercase">Syndicate Supply Co. — Sales Report</p>
            </div>

            <p className="mt-6 text-sm text-white/50 admin-light:text-ink-900/60">
                <span className="font-semibold text-white admin-light:text-ink-900">{period_label}</span>
                {' · '}paid orders only, by payment date. Deposit orders count the deposit until they're completed.
                Changes are against the previous {trend.length > 1 ? 'period' : 'day'} ({previous_label}).
            </p>

            <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
                <Figure label="Revenue collected" value={formatCentavos(summary.revenue_centavos)} delta={change(summary.revenue_centavos, previous.revenue_centavos)} hint="vs previous" />
                <Figure label="Orders paid" value={summary.orders} delta={change(summary.orders, previous.orders)} hint="vs previous" />
                <Figure label="Average order" value={formatCentavos(summary.average_centavos)} delta={change(summary.average_centavos, previous.average_centavos)} hint="vs previous" />
                <Figure label="Items sold" value={summary.units} delta={change(summary.units, previous.units)} hint="vs previous" />
                <Figure label="Balance still due" value={formatCentavos(summary.balance_due_centavos)} hint="cash owed on deposit orders" />
                <Figure label="Cancelled" value={summary.cancelled} hint="orders in this period" />
            </div>

            <Card className="mt-6">
                <div className="border-b border-white/10 px-6 py-4 admin-light:border-ink-900/10">
                    <h2 className="font-oswald font-semibold uppercase tracking-wide text-white admin-light:text-ink-900">Revenue by {filters.interval}</h2>
                </div>
                <div className="h-72 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid vertical={false} stroke={c.grid} />
                            <XAxis dataKey="short" tick={{ fontSize: 11, fill: c.tick }} tickLine={false} axisLine={{ stroke: c.grid }} interval={tickEvery} />
                            <YAxis
                                tick={{ fontSize: 11, fill: c.tick }}
                                tickLine={false}
                                axisLine={false}
                                width={48}
                                allowDecimals={false}
                                tickFormatter={(v) => (v === 0 ? '0' : `₱${PESO_COMPACT.format(v / 100)}`)}
                            />
                            <Tooltip
                                cursor={{ fill: c.cursor }}
                                formatter={(value, name, item) => [`${formatCentavos(value)} · ${item.payload.orders} orders`, 'Revenue']}
                                labelFormatter={(_, payload) => payload?.[0]?.payload.label ?? ''}
                                contentStyle={{ fontSize: 12, borderRadius: 6, backgroundColor: c.tooltipBg, borderColor: c.tooltipBorder, color: c.tooltipText }}
                                labelStyle={{ color: c.tick }}
                            />
                            <Bar dataKey="revenue_centavos" fill={c.bar} radius={[3, 3, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <Card className="overflow-hidden">
                    <div className="border-b border-white/10 px-6 py-4 admin-light:border-ink-900/10">
                        <h2 className="font-oswald font-semibold uppercase tracking-wide text-white admin-light:text-ink-900">Best sellers</h2>
                        <p className="text-sm text-white/40 admin-light:text-ink-900/50">Top 10 by revenue in this period.</p>
                    </div>
                    {top_items.length === 0 ? (
                        <p className="px-6 py-8 text-sm text-white/40 admin-light:text-ink-900/50">No sales in this period.</p>
                    ) : (
                        <table className="min-w-full text-sm">
                            <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-white/40 admin-light:bg-ink-900/[0.04] admin-light:text-ink-900/50">
                                <tr>
                                    <th className="px-6 py-2 text-left font-medium">Item</th>
                                    <th className="px-3 py-2 text-right font-medium">Units</th>
                                    <th className="px-6 py-2 text-right font-medium">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10 admin-light:divide-ink-900/10">
                                {top_items.map((item) => (
                                    <tr key={item.category + item.name}>
                                        <td className="px-6 py-2.5 text-white admin-light:text-ink-900">
                                            {item.name}
                                            <span className="ml-2 text-xs text-white/35 admin-light:text-ink-900/45">{item.category}</span>
                                        </td>
                                        <td className="px-3 py-2.5 text-right tabular-nums text-white/60 admin-light:text-ink-900/65">{item.units}</td>
                                        <td className="px-6 py-2.5 text-right tabular-nums text-white admin-light:text-ink-900">{item.revenue_formatted}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </Card>

                <Card className="space-y-6 p-6">
                    <h2 className="font-oswald font-semibold uppercase tracking-wide text-white admin-light:text-ink-900">Mix</h2>
                    <Split
                        title="Apparel vs skateboard (item revenue)"
                        left={{ label: 'Apparel', value: split.apparel_centavos, display: formatCentavos(split.apparel_centavos) }}
                        right={{ label: 'Skateboard', value: split.skateboard_centavos, display: formatCentavos(split.skateboard_centavos) }}
                    />
                    <Split
                        title="Pickup vs delivery (orders)"
                        left={{ label: 'Pickup', value: split.pickup, display: split.pickup }}
                        right={{ label: 'Delivery', value: split.delivery, display: split.delivery }}
                    />
                    <Split
                        title="Paid in full vs 50% deposit (orders)"
                        left={{ label: 'In full', value: split.paid_in_full, display: split.paid_in_full }}
                        right={{ label: 'Deposit', value: split.deposit, display: split.deposit }}
                    />
                </Card>
            </div>

            <Card className="mt-6 overflow-hidden">
                <div className="border-b border-white/10 px-6 py-4 admin-light:border-ink-900/10">
                    <h2 className="font-oswald font-semibold uppercase tracking-wide text-white admin-light:text-ink-900">Breakdown by {filters.interval}</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-white/40 admin-light:bg-ink-900/[0.04] admin-light:text-ink-900/50">
                            <tr>
                                <th className="px-6 py-2 text-left font-medium">Period</th>
                                <th className="px-3 py-2 text-right font-medium">Orders</th>
                                <th className="px-3 py-2 text-right font-medium">Revenue</th>
                                <th className="px-6 py-2 text-right font-medium">Average</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 admin-light:divide-ink-900/10">
                            {[...trend].reverse().map((row) => (
                                <tr key={row.key} className={row.orders ? '' : 'text-white/30 admin-light:text-ink-900/35'}>
                                    <td className="px-6 py-2 text-white/80 admin-light:text-ink-900/80">{row.label}</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-white/60 admin-light:text-ink-900/65">{row.orders}</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-white admin-light:text-ink-900">{formatCentavos(row.revenue_centavos)}</td>
                                    <td className="px-6 py-2 text-right tabular-nums text-white/60 admin-light:text-ink-900/65">
                                        {row.orders ? formatCentavos(Math.floor(row.revenue_centavos / row.orders)) : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-white/[0.04] font-semibold admin-light:bg-ink-900/[0.04]">
                            <tr>
                                <td className="px-6 py-2.5 text-white admin-light:text-ink-900">Total</td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-white admin-light:text-ink-900">{summary.orders}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-white admin-light:text-ink-900">{formatCentavos(summary.revenue_centavos)}</td>
                                <td className="px-6 py-2.5 text-right tabular-nums text-white admin-light:text-ink-900">{formatCentavos(summary.average_centavos)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </Card>
        </AdminLayout>
    );
}
