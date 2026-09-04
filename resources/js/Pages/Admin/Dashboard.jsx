import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import OrderStatusBadge from '@/Components/Admin/OrderStatusBadge';
import StockBadge from '@/Components/Admin/StockBadge';
import {
    ArrowRightIcon,
    TrendUpIcon,
    TrendDownIcon,
    BanknotesIcon,
    ClockIcon,
    TruckIcon,
    ArchiveBoxIcon,
    TagIcon,
    CubeIcon,
    ExclamationTriangleIcon,
    XCircleIcon,
} from '@/Components/Admin/icons';
import { formatCentavos } from '@/utils/money';
import { useAdminTheme } from '@/utils/useAdminTheme';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const LINK_CLASSES =
    'inline-flex items-center gap-1 text-sm text-volt-500 hover:text-volt-400 admin-light:text-volt-800 admin-light:hover:underline';

/** Recharts reads raw hex props at render time, not Tailwind classes or CSS
 *  custom properties — so unlike everything else on this page, the chart
 *  needs its colours picked in JS per theme, not just an `admin-light:`
 *  class pair. Light-mode stroke reuses `volt-800` (`#5c7600`) for the same
 *  reason storefront text does: full-brightness volt is ~1.2:1 on a light
 *  ground, illegible as a thin line. */
const CHART_COLORS = {
    dark: {
        stroke: '#ccff00',
        tick: '#6b6b73',
        axisLine: '#242424',
        tooltipBg: 'rgba(11,11,11,0.92)',
        tooltipBorder: '#242424',
        tooltipText: '#ffffff',
        tooltipLabel: '#8a8a8f',
        activeDotStroke: '#0b0b0b',
    },
    light: {
        stroke: '#5c7600',
        tick: '#8a8a8f',
        axisLine: '#e2e0d4',
        tooltipBg: 'rgba(255,255,255,0.94)',
        tooltipBorder: '#e2e0d4',
        tooltipText: '#0b0b0b',
        tooltipLabel: '#5b5b62',
        activeDotStroke: '#ffffff',
    },
};

/** One faint diagonal-grid SVG pattern, reused by every stat card — the
 *  same technique proven in the approved "Control Room" mockup, now reading
 *  real numbers. A fresh pattern id per card avoids duplicate-id collisions
 *  when several cards render on one page. */
function GridTexture({ id }) {
    return (
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-40" aria-hidden="true">
            <defs>
                <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse">
                    <path d="M16 0H0V16" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${id})`} className="text-white/10 admin-light:text-ink-900/[0.06]" />
        </svg>
    );
}

/** 7-point sparkline off real data — no axes, just a shape, same spirit as
 *  a proper chart's mark care (dataviz skill): a thin stroke, no decoration
 *  beyond what the numbers already say. */
function Sparkline({ values, up, theme }) {
    const w = 64, h = 24;
    const max = Math.max(...values), min = Math.min(...values);
    const range = max - min || 1;
    const points = values
        .map((v, i) => {
            const x = (i / (values.length - 1)) * w;
            const y = h - ((v - min) / range) * (h - 4) - 2;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
    // `up` is null when there's no real yesterday figure to compare against
    // (see hasTrend below) — render neutral rather than defaulting to red,
    // which would imply a decline that was never actually computed.
    const isLight = theme === 'light';
    const stroke = up === null ? (isLight ? '#9c9ca6' : '#6b6b73') : up ? (isLight ? '#16a34a' : '#4ade80') : (isLight ? '#dc2626' : '#f87171');

    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
            <polyline
                points={points}
                fill="none"
                stroke={stroke}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function StatCard({ label, value, tone = 'default', primary = false, trendPct, spark, icon: IconComp, theme }) {
    const toneClasses = {
        default: 'text-white admin-light:text-ink-900',
        warning: 'text-amber-400 admin-light:text-amber-600',
        danger: 'text-red-400 admin-light:text-red-600',
    };
    const hasTrend = typeof trendPct === 'number' && Number.isFinite(trendPct);
    const up = hasTrend ? trendPct >= 0 : null;

    return (
        <Card className="relative overflow-hidden px-5 py-4">
            <GridTexture id={`tex-${label.replace(/\s+/g, '')}`} />
            {primary && (
                <div
                    className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full opacity-30 blur-2xl"
                    style={{ background: 'radial-gradient(circle, #ccff00 0%, transparent 70%)' }}
                    aria-hidden="true"
                />
            )}

            <div className="relative flex items-start justify-between">
                {IconComp && (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white/50 admin-light:border-ink-900/10 admin-light:bg-ink-900/[0.04] admin-light:text-ink-900/50">
                        <IconComp className="h-4 w-4" />
                    </span>
                )}
                {hasTrend && (
                    <span
                        className={
                            'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-bold ' +
                            (up ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400')
                        }
                    >
                        {up ? <TrendUpIcon className="h-2.5 w-2.5" /> : <TrendDownIcon className="h-2.5 w-2.5" />}
                        {Math.abs(trendPct).toFixed(1)}%
                    </span>
                )}
            </div>

            <div className="relative mt-3 text-xs font-medium text-white/50 admin-light:text-ink-900/55">{label}</div>
            <div className={`font-oswald relative mt-1 text-2xl font-semibold tabular-nums ${toneClasses[tone]}`}>
                {value}
            </div>

            {spark && (
                <div className="relative mt-2 flex items-center justify-between">
                    <span className="text-[10.5px] text-white/30 admin-light:text-ink-900/40">vs. same time yesterday</span>
                    <Sparkline values={spark} up={up} theme={theme} />
                </div>
            )}
        </Card>
    );
}

/** Recharts reads raw hex via props, not Tailwind classes — these are the
 *  admin's actual volt-500 / ink tokens, hand-copied here since a chart lib
 *  prop can't resolve a CSS custom property at draw time. `theme` picks the
 *  right set from CHART_COLORS above. */
function RevenueTrendChart({ revenueTrend, theme }) {
    const c = CHART_COLORS[theme];

    return (
        <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={c.stroke} stopOpacity={0.32} />
                            <stop offset="100%" stopColor={c.stroke} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="day"
                        tick={{ fontSize: 11, fill: c.tick }}
                        tickLine={false}
                        axisLine={{ stroke: c.axisLine }}
                        interval={4}
                    />
                    <YAxis
                        tick={{ fontSize: 11, fill: c.tick }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        tickFormatter={(v) => (v === 0 ? '0' : `${Math.round(v / 100000)}k`)}
                    />
                    <Tooltip
                        formatter={(value) => [formatCentavos(value), 'Revenue']}
                        contentStyle={{
                            fontSize: 12,
                            borderRadius: 6,
                            backgroundColor: c.tooltipBg,
                            borderColor: c.tooltipBorder,
                            color: c.tooltipText,
                        }}
                        labelStyle={{ color: c.tooltipLabel }}
                        cursor={{ stroke: c.axisLine }}
                    />
                    <Area
                        type="monotone"
                        dataKey="revenue_centavos"
                        stroke={c.stroke}
                        strokeWidth={2}
                        fill="url(#revenueFill)"
                        activeDot={{ r: 4, fill: c.stroke, stroke: c.activeDotStroke, strokeWidth: 2 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

/** Same Sales Trend data, plain rows — an accessibility/skim alternative to
 *  the chart, not a second data source. Matches the approved mockup's "View
 *  as table" toggle. */
function RevenueTrendTable({ revenueTrend }) {
    return (
        <div className="max-h-56 overflow-y-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm admin-light:divide-ink-900/10">
                <thead>
                    <tr>
                        <th className="py-1.5 text-left text-xs font-medium uppercase tracking-wide text-white/40 admin-light:text-ink-900/50">
                            Date
                        </th>
                        <th className="py-1.5 text-right text-xs font-medium uppercase tracking-wide text-white/40 admin-light:text-ink-900/50">
                            Revenue
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5 admin-light:divide-ink-900/5">
                    {revenueTrend.map((d) => (
                        <tr key={d.day}>
                            <td className="py-1.5 text-white/60 admin-light:text-ink-900/70">{d.day}</td>
                            <td className="font-oswald py-1.5 text-right tabular-nums text-white admin-light:text-ink-900">
                                {formatCentavos(d.revenue_centavos)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** Real ring/donut — apparel vs. skateboard, wired to categorySplit as
 *  fetched (no dummy data). Uses the chart-safe lime/blue pair validated
 *  against this page's actual dark surface — full-brightness volt fails as
 *  a categorical mark (too light), so it's reserved for UI chrome and the
 *  chart above, which is a solo series. `chart-*-light` is a SEPARATE
 *  validated pair for the light surface, not the same colours reused — a
 *  dark-safe mark isn't automatically light-safe (different lightness band),
 *  confirmed with the dataviz skill's checker before use. */
function CategorySplit({ categorySplit }) {
    const apparel = categorySplit.apparel_centavos;
    const skateboard = categorySplit.skateboard_centavos;
    const total = apparel + skateboard;
    const apparelPct = total > 0 ? Math.round((apparel / total) * 100) : 0;
    const skatePct = total > 0 ? 100 - apparelPct : 0;

    if (total === 0) {
        return <p className="text-sm text-white/40 admin-light:text-ink-900/50">No paid orders yet.</p>;
    }

    const r = 46;
    const c = 2 * Math.PI * r;
    const gap = total > 0 && apparelPct > 0 && skatePct > 0 ? 3 : 0;
    const apparelLen = (apparelPct / 100) * (c - gap * 2);
    const skateLen = (skatePct / 100) * (c - gap * 2);

    return (
        <div>
            <div className="flex items-center gap-5">
                <svg width="112" height="112" viewBox="0 0 120 120" className="shrink-0">
                    <circle
                        cx="60" cy="60" r={r} fill="none" strokeWidth="14"
                        className="stroke-white/[0.06] admin-light:stroke-ink-900/[0.06]"
                    />
                    <circle
                        cx="60" cy="60" r={r} fill="none" strokeWidth="14" strokeLinecap="round"
                        className="stroke-chart-blue admin-light:stroke-chart-blue-light"
                        strokeDasharray={`${apparelLen} ${c}`}
                        transform="rotate(-90 60 60)"
                    />
                    <circle
                        cx="60" cy="60" r={r} fill="none" strokeWidth="14" strokeLinecap="round"
                        className="stroke-chart-lime admin-light:stroke-chart-lime-light"
                        strokeDasharray={`${skateLen} ${c}`}
                        strokeDashoffset={-(apparelLen + gap)}
                        transform="rotate(-90 60 60)"
                    />
                    <text
                        x="60" y="57" textAnchor="middle"
                        className="font-oswald fill-white text-[20px] font-semibold admin-light:fill-ink-900"
                    >
                        {apparelPct}%
                    </text>
                    <text
                        x="60" y="72" textAnchor="middle"
                        className="fill-white/40 text-[8.5px] tracking-wide admin-light:fill-ink-900/50"
                    >
                        APPAREL
                    </text>
                </svg>

                <ul className="flex flex-1 flex-col gap-2.5 text-sm">
                    <li className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-chart-blue admin-light:bg-chart-blue-light" />
                        <span className="flex-1 text-white/60 admin-light:text-ink-900/70">Apparel</span>
                        <span className="font-oswald font-semibold text-white admin-light:text-ink-900">{formatCentavos(apparel)}</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-chart-lime admin-light:bg-chart-lime-light" />
                        <span className="flex-1 text-white/60 admin-light:text-ink-900/70">Skateboard</span>
                        <span className="font-oswald font-semibold text-white admin-light:text-ink-900">{formatCentavos(skateboard)}</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}

/** The donut panel's own compact echo of the full "Needs restocking" list
 *  below — top 4, same spirit as the approved mockup's restock widget living
 *  inside its donut card. The full card further down stays the complete,
 *  actionable list (objective 4 needs every low-stock row, not just 4) —
 *  this widget is a glance, not a replacement. */
function CompactRestockList({ items }) {
    if (items.length === 0) return null;
    const top = items.slice(0, 4);

    return (
        <div className="mt-4 border-t border-white/10 pt-3 admin-light:border-ink-900/10">
            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-white/30 admin-light:text-ink-900/40">
                Needs restocking
            </p>
            <ul className="space-y-2.5">
                {top.map((item, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                            <div className="truncate font-medium text-white admin-light:text-ink-900">{item.name}</div>
                            <div className="text-xs text-white/40 admin-light:text-ink-900/50">threshold {item.threshold}</div>
                        </div>
                        <span className="font-oswald shrink-0 text-xs font-semibold text-amber-400 admin-light:text-amber-600">
                            {item.stock} left
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function Dashboard({ stats, lowStockItems, recentOrders, revenueTrend, categorySplit, topProducts }) {
    const { theme } = useAdminTheme();
    const [showTrendTable, setShowTrendTable] = useState(false);
    const yesterday = stats.revenue_yesterday_centavos;
    const today = stats.revenue_today_centavos;
    const trendPct = yesterday > 0 ? ((today - yesterday) / yesterday) * 100 : null;
    const spark7 = revenueTrend.slice(-7).map((d) => d.revenue_centavos);

    return (
        <AdminLayout header="Dashboard">
            <Head title="Admin Dashboard" />

            {/* Trading first — what came in and what needs acting on. Stock
                counts matter, but nobody opens a dashboard to learn how many
                variants exist. */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard
                    label="Revenue today"
                    value={formatCentavos(today)}
                    primary
                    trendPct={trendPct}
                    spark={spark7.length > 1 ? spark7 : null}
                    icon={BanknotesIcon}
                    theme={theme}
                />
                <StatCard label="Revenue all time" value={stats.revenue_total} icon={BanknotesIcon} theme={theme} />
                <StatCard label="Awaiting payment" value={stats.awaiting_payment} tone="warning" icon={ClockIcon} theme={theme} />
                <StatCard label="Paid — to hand over" value={stats.to_fulfil} icon={TruckIcon} theme={theme} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
                <StatCard label="Products" value={stats.products} icon={ArchiveBoxIcon} theme={theme} />
                <StatCard label="Apparel variants" value={stats.variants} icon={TagIcon} theme={theme} />
                <StatCard label="Skate components" value={stats.components} icon={CubeIcon} theme={theme} />
                <StatCard label="Low stock" value={stats.low_stock_count} tone="warning" icon={ExclamationTriangleIcon} theme={theme} />
                <StatCard label="Out of stock" value={stats.out_of_stock_count} tone="danger" icon={XCircleIcon} theme={theme} />
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 admin-light:border-ink-900/10">
                        <div>
                            <h2 className="font-oswald font-semibold uppercase tracking-wide text-white admin-light:text-ink-900">Sales trend</h2>
                            <p className="text-sm text-white/40 admin-light:text-ink-900/50">Revenue from paid orders, last 30 days.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowTrendTable((v) => !v)}
                            className="shrink-0 rounded-md border border-white/15 px-2.5 py-1 text-xs font-semibold text-white/60 transition hover:border-white/30 hover:text-white admin-light:border-ink-900/15 admin-light:text-ink-900/60 admin-light:hover:border-ink-900/30 admin-light:hover:text-ink-900"
                        >
                            {showTrendTable ? 'View as chart' : 'View as table'}
                        </button>
                    </div>
                    <div className="p-6">
                        {showTrendTable ? (
                            <RevenueTrendTable revenueTrend={revenueTrend} />
                        ) : (
                            <RevenueTrendChart revenueTrend={revenueTrend} theme={theme} />
                        )}
                    </div>
                </Card>

                <Card>
                    <div className="border-b border-white/10 px-6 py-4 admin-light:border-ink-900/10">
                        <h2 className="font-oswald font-semibold uppercase tracking-wide text-white admin-light:text-ink-900">Apparel vs. skateboard</h2>
                        <p className="text-sm text-white/40 admin-light:text-ink-900/50">Share of all-time revenue.</p>
                    </div>
                    <div className="p-6">
                        <CategorySplit categorySplit={categorySplit} />
                        <CompactRestockList items={lowStockItems} />
                    </div>
                </Card>
            </div>

            <Card className="mt-3">
                <div className="border-b border-white/10 px-6 py-4 admin-light:border-ink-900/10">
                    <h2 className="font-oswald font-semibold uppercase tracking-wide text-white admin-light:text-ink-900">Top products</h2>
                    <p className="text-sm text-white/40 admin-light:text-ink-900/50">Units sold, all-time, paid orders only.</p>
                </div>
                {topProducts.length === 0 ? (
                    <p className="px-6 py-8 text-sm text-white/40 admin-light:text-ink-900/50">No paid orders yet.</p>
                ) : (
                    <ul className="divide-y divide-white/10 admin-light:divide-ink-900/10">
                        {topProducts.map((product, i) => (
                            <li key={product.name} className="flex items-center justify-between gap-4 px-6 py-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="font-oswald w-4 text-xs font-medium tabular-nums text-white/30 admin-light:text-ink-900/40">{i + 1}</span>
                                    <span className="truncate text-sm font-medium text-white admin-light:text-ink-900">{product.name}</span>
                                </div>
                                <span className="shrink-0 text-sm tabular-nums text-white/40 admin-light:text-ink-900/50">{product.units} sold</span>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            <Card className="mt-6">
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 admin-light:border-ink-900/10">
                    <div>
                        <h2 className="font-oswald font-semibold uppercase tracking-wide text-white admin-light:text-ink-900">Recent orders</h2>
                        <p className="text-sm text-white/40 admin-light:text-ink-900/50">Objective 10 — the five most recent, whatever their status.</p>
                    </div>
                    <Link href={route('admin.orders.index')} className={LINK_CLASSES}>
                        All orders
                        <ArrowRightIcon className="h-3.5 w-3.5" />
                    </Link>
                </div>

                {recentOrders.length === 0 ? (
                    <p className="px-6 py-8 text-sm text-white/40 admin-light:text-ink-900/50">No orders yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-white/10 admin-light:divide-ink-900/10">
                            <thead className="bg-white/[0.04] admin-light:bg-ink-900/[0.04]">
                                <tr>
                                    {['Order', 'Customer', 'Items', 'Total', 'Status', 'Placed', ''].map((heading, i) => (
                                        <th
                                            key={i}
                                            className={
                                                'px-6 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-widest text-white/40 admin-light:text-ink-900/50 ' +
                                                (heading === '' ? 'text-right' : '')
                                            }
                                        >
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10 admin-light:divide-ink-900/10">
                                {recentOrders.map((order) => (
                                    <tr key={order.order_number} className="hover:bg-white/[0.03] admin-light:hover:bg-ink-900/[0.03]">
                                        <td className="font-oswald px-6 py-3 text-sm font-medium text-white admin-light:text-ink-900">{order.order_number}</td>
                                        <td className="px-6 py-3 text-sm text-white/60 admin-light:text-ink-900/70">{order.customer_name}</td>
                                        <td className="px-6 py-3 text-sm tabular-nums text-white/60 admin-light:text-ink-900/70">{order.items_count}</td>
                                        <td className="px-6 py-3 text-sm tabular-nums text-white admin-light:text-ink-900">{order.total_formatted}</td>
                                        <td className="px-6 py-3">
                                            <OrderStatusBadge status={order.status} />
                                        </td>
                                        <td className="px-6 py-3 text-sm text-white/40 admin-light:text-ink-900/50">{order.placed_at}</td>
                                        <td className="px-6 py-3 text-right">
                                            <Link
                                                href={route('admin.orders.show', order.order_number)}
                                                className={'font-semibold ' + LINK_CLASSES}
                                            >
                                                View
                                                <ArrowRightIcon className="h-3.5 w-3.5" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Card className="mt-6">
                <div className="border-b border-white/10 px-6 py-4 admin-light:border-ink-900/10">
                    <h2 className="font-oswald font-semibold uppercase tracking-wide text-white admin-light:text-ink-900">Needs restocking</h2>
                    <p className="text-sm text-white/40 admin-light:text-ink-900/50">Objective 4 — items at or below their low-stock threshold.</p>
                </div>

                {lowStockItems.length === 0 ? (
                    <p className="px-6 py-8 text-sm text-white/40 admin-light:text-ink-900/50">Nothing is low on stock right now.</p>
                ) : (
                    <ul className="divide-y divide-white/10 admin-light:divide-ink-900/10">
                        {lowStockItems.map((item, i) => (
                            <li key={i} className="flex items-center justify-between gap-4 px-6 py-3">
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-white admin-light:text-ink-900">{item.name}</div>
                                    <div className="text-xs text-white/40 admin-light:text-ink-900/50">threshold {item.threshold}</div>
                                </div>
                                <div className="flex shrink-0 items-center gap-4">
                                    <StockBadge
                                        stock={item.stock}
                                        isLowStock={item.is_low_stock}
                                        isOutOfStock={item.is_out_of_stock}
                                        threshold={item.threshold}
                                    />
                                    {item.edit_url && (
                                        <Link href={item.edit_url} className={LINK_CLASSES}>
                                            Manage
                                            <ArrowRightIcon className="h-3.5 w-3.5" />
                                        </Link>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </AdminLayout>
    );
}
