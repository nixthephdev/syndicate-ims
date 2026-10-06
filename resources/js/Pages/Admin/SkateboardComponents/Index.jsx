import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import StatTile from '@/Components/Admin/StatTile';
import StockBadge from '@/Components/Admin/StockBadge';
import StockFilters from '@/Components/Admin/StockFilters';
import { ArrowRightIcon, CubeIcon, ExclamationTriangleIcon, PhotoIcon, TagIcon, XCircleIcon } from '@/Components/Admin/icons';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

function PartCard({ part }) {
    return (
        <Link
            href={route('admin.skateboard-components.edit', part.id)}
            className="group flex flex-col overflow-hidden rounded-md border border-white/10 bg-ink-900 transition hover:-translate-y-0.5 hover:border-volt-500/60 admin-light:border-ink-900/10 admin-light:bg-white admin-light:hover:border-volt-800/60"
        >
            {/* Real renders of the 3D mesh (public/images/parts), on a soft
                spotlight so the transparent PNGs don't float on flat black. */}
            <div className="relative flex aspect-[4/3] items-center justify-center bg-[radial-gradient(circle_at_center,rgba(204,255,0,0.08),transparent_70%)] p-4">
                {part.image_url ? (
                    <img src={part.image_url} alt="" className="max-h-full max-w-full object-contain transition group-hover:scale-105" />
                ) : (
                    <PhotoIcon className="h-8 w-8 text-white/20 admin-light:text-ink-900/25" />
                )}
                {!part.is_active && (
                    <span className="absolute left-2 top-2 rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] text-white/50 admin-light:bg-ink-900/[0.06] admin-light:text-ink-900/50">
                        Hidden
                    </span>
                )}
            </div>
            <div className="flex flex-1 flex-col gap-2 border-t border-white/10 p-4 admin-light:border-ink-900/10">
                <p className="font-semibold leading-snug text-white admin-light:text-ink-900">{part.name}</p>
                <p className="font-oswald text-lg font-bold text-volt-500 admin-light:text-volt-800">{part.price_formatted}</p>
                <div className="mt-auto flex items-end justify-between gap-2">
                    <StockBadge
                        stock={part.stock}
                        isLowStock={part.is_low_stock}
                        isOutOfStock={part.is_out_of_stock}
                        threshold={part.low_stock_threshold}
                    />
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-volt-500 opacity-70 transition group-hover:opacity-100 admin-light:text-volt-800">
                        Manage <ArrowRightIcon className="h-3 w-3" />
                    </span>
                </div>
            </div>
        </Link>
    );
}

/**
 * Grouped by type — 14 decks and a single Trucks row are genuinely different
 * inventories, and one flat list would bury that. Edit-only: parts are tied
 * to meshes inside the 3D model files, so there is no "add" here.
 */
export default function Index({ components, typeLabels }) {
    const [term, setTerm] = useState('');
    const [stock, setStock] = useState('all');
    const needle = term.trim().toLowerCase();

    const matches = (c) =>
        (stock === 'all' || (stock === 'out' && c.is_out_of_stock) || (stock === 'low' && c.is_low_stock && !c.is_out_of_stock)) &&
        (!needle || c.name.toLowerCase().includes(needle));

    const filtering = stock !== 'all' || needle !== '';

    const groups = Object.keys(typeLabels)
        .map((type) => ({
            type,
            label: typeLabels[type],
            items: components.filter((c) => c.type === type && matches(c)).sort((a, b) => a.name.localeCompare(b.name)),
        }))
        // While filtering, an empty group is noise, not a finding.
        .filter((group) => !filtering || group.items.length > 0);

    const totals = {
        units: components.reduce((sum, c) => sum + c.stock, 0),
        low: components.filter((c) => c.is_low_stock && !c.is_out_of_stock).length,
        out: components.filter((c) => c.is_out_of_stock).length,
    };

    return (
        <AdminLayout header="Skate Components">
            <Head title="Admin · Skate Components" />

            <p className="mb-6 text-sm text-white/40 admin-light:text-ink-900/50">
                The parts behind the 3D board builder. Edit price, stock and alerts here; names of the 3D models are locked.
            </p>

            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatTile label="Parts" value={components.length} hint={`${Object.keys(typeLabels).length} types`} icon={TagIcon} />
                <StatTile label="Units in stock" value={totals.units.toLocaleString()} hint="all parts" icon={CubeIcon} />
                <StatTile
                    label="Running low"
                    value={totals.low}
                    hint="at or under threshold"
                    tone={totals.low ? 'warning' : 'default'}
                    icon={ExclamationTriangleIcon}
                    onClick={() => setStock(stock === 'low' ? 'all' : 'low')}
                    active={stock === 'low'}
                />
                <StatTile
                    label="Sold out"
                    value={totals.out}
                    hint="can't be ordered"
                    tone={totals.out ? 'danger' : 'default'}
                    icon={XCircleIcon}
                    onClick={() => setStock(stock === 'out' ? 'all' : 'out')}
                    active={stock === 'out'}
                />
            </div>

            <StockFilters term={term} onTermChange={setTerm} stock={stock} onStockChange={setStock} placeholder="Search parts" />

            {groups.length === 0 && (
                <Card className="px-6 py-12 text-center text-sm text-white/40 admin-light:text-ink-900/50">No parts match these filters.</Card>
            )}

            {groups.map((group) => (
                <section key={group.type} className="mb-10">
                    <div className="mb-3 flex items-baseline gap-2">
                        <h2 className="font-oswald text-lg font-bold uppercase tracking-wide text-white admin-light:text-ink-900">{group.label}</h2>
                        <span className="text-sm text-white/30 admin-light:text-ink-900/40">{group.items.length}</span>
                    </div>

                    {group.items.length === 0 ? (
                        <Card className="px-6 py-6 text-sm text-white/40 admin-light:text-ink-900/50">No {group.label.toLowerCase()} yet.</Card>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                            {group.items.map((part) => (
                                <PartCard key={part.id} part={part} />
                            ))}
                        </div>
                    )}
                </section>
            ))}
        </AdminLayout>
    );
}
