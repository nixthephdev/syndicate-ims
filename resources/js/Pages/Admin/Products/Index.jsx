import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PrimaryButton from '@/Components/Admin/PrimaryButton';
import StatTile from '@/Components/Admin/StatTile';
import StockFilters, { filterInputClasses } from '@/Components/Admin/StockFilters';
import {
    ArrowRightIcon,
    CubeIcon,
    ExclamationTriangleIcon,
    ListBulletIcon,
    PhotoIcon,
    PlusIcon,
    Squares2x2Icon,
    TagIcon,
    XCircleIcon,
} from '@/Components/Admin/icons';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

const VIEW_KEY = 'syndicate-admin-products-view';

const matchesStock = (product, stock) =>
    stock === 'all' ||
    (stock === 'out' && product.out_of_stock_count > 0) ||
    (stock === 'low' && product.low_stock_count > 0);

function readView() {
    try {
        return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'grid';
    } catch {
        return 'grid';
    }
}

function StatusPill({ active }) {
    return (
        <span
            className={
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ' +
                (active
                    ? 'bg-green-500/10 text-green-400 ring-green-500/20'
                    : 'bg-white/[0.06] text-white/40 ring-white/10 admin-light:bg-ink-900/[0.06] admin-light:text-ink-900/50 admin-light:ring-ink-900/10')
            }
        >
            {active ? 'Active' : 'Archived'}
        </span>
    );
}

/** "12 in stock", plus how many sizes/colours need attention. */
function StockLine({ product }) {
    return (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="text-white/70 admin-light:text-ink-900/75">
                <span className="font-semibold text-white admin-light:text-ink-900">{product.total_stock}</span> in stock
            </span>
            {product.out_of_stock_count > 0 && (
                <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-red-400">
                    {product.out_of_stock_count} out
                </span>
            )}
            {product.low_stock_count > 0 && (
                <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-amber-400">
                    {product.low_stock_count} low
                </span>
            )}
        </div>
    );
}

function Thumb({ product, className }) {
    return product.image_path ? (
        <img src={product.image_path} alt="" className={`object-cover ${className}`} />
    ) : (
        <div className={`flex items-center justify-center bg-white/[0.04] text-white/20 admin-light:bg-ink-900/[0.04] admin-light:text-ink-900/25 ${className}`}>
            <PhotoIcon className="h-6 w-6" />
        </div>
    );
}

function ProductCard({ product, typeLabels }) {
    return (
        <Link
            href={route('admin.products.edit', product.id)}
            className="group flex flex-col overflow-hidden rounded-md border border-white/10 bg-ink-900 transition hover:-translate-y-0.5 hover:border-volt-500/60 admin-light:border-ink-900/10 admin-light:bg-white admin-light:hover:border-volt-800/60"
        >
            <div className="relative">
                <Thumb product={product} className="aspect-[4/3] w-full" />
                <div className="absolute left-2 top-2 rounded-full bg-ink-950/80">
                    <StatusPill active={product.is_active} />
                </div>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
                <div>
                    <p className="text-[11px] uppercase tracking-wider text-white/35 admin-light:text-ink-900/45">
                        {typeLabels[product.type] ?? product.category}
                    </p>
                    <p className="mt-0.5 font-semibold leading-snug text-white admin-light:text-ink-900">{product.name}</p>
                </div>
                <p className="font-oswald text-lg font-bold text-volt-500 admin-light:text-volt-800">{product.base_price_formatted}</p>
                <div className="mt-auto flex items-end justify-between gap-2 border-t border-white/10 pt-3 admin-light:border-ink-900/10">
                    <StockLine product={product} />
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-volt-500 opacity-70 transition group-hover:opacity-100 admin-light:text-volt-800">
                        Manage <ArrowRightIcon className="h-3 w-3" />
                    </span>
                </div>
            </div>
        </Link>
    );
}

function ProductTable({ products, typeLabels }) {
    const th = 'px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40 admin-light:text-ink-900/50';

    return (
        <Card className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 admin-light:divide-ink-900/10">
                <thead className="bg-white/[0.04] admin-light:bg-ink-900/[0.04]">
                    <tr>
                        <th className="py-3 pl-4 pr-2 sm:pl-6" />
                        <th className={th}>Product</th>
                        <th className={th}>Price</th>
                        <th className={th}>Variants</th>
                        <th className={th}>Stock</th>
                        <th className={th}>Status</th>
                        {/* Sticky so Manage stays reachable when the table
                            scrolls sideways on a narrow screen. */}
                        <th className="sticky right-0 bg-ink-900 py-3 pl-2 pr-4 admin-light:bg-white sm:pr-6" />
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/10 admin-light:divide-ink-900/10">
                    {products.map((product) => (
                        <tr key={product.id} className="hover:bg-white/[0.03] admin-light:hover:bg-ink-900/[0.03]">
                            <td className="py-3 pl-4 pr-2 sm:pl-6">
                                <Thumb product={product} className="h-11 w-11 rounded-md" />
                            </td>
                            <td className="px-3 py-3">
                                <p className="text-sm font-medium text-white admin-light:text-ink-900">{product.name}</p>
                                <p className="text-xs text-white/40 admin-light:text-ink-900/50">
                                    {typeLabels[product.type] ?? product.category}
                                </p>
                            </td>
                            <td className="px-3 py-3 text-sm text-white/60 admin-light:text-ink-900/70">{product.base_price_formatted}</td>
                            <td className="px-3 py-3 text-sm text-white/60 admin-light:text-ink-900/70">{product.variants_count}</td>
                            <td className="px-3 py-3">
                                <StockLine product={product} />
                            </td>
                            <td className="px-3 py-3">
                                <StatusPill active={product.is_active} />
                            </td>
                            <td className="sticky right-0 bg-ink-900 py-3 pl-2 pr-4 text-right text-sm admin-light:bg-white sm:pr-6">
                                <Link
                                    href={route('admin.products.edit', product.id)}
                                    className="inline-flex items-center gap-1 text-volt-500 hover:text-volt-400 admin-light:text-volt-800"
                                >
                                    Manage
                                    <ArrowRightIcon className="h-3.5 w-3.5" />
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Card>
    );
}

export default function Index({ products, typeLabels }) {
    const [term, setTerm] = useState('');
    const [stock, setStock] = useState('all');
    const [type, setType] = useState('');
    const [view, setViewState] = useState(readView);

    const setView = (next) => {
        setViewState(next);
        try {
            localStorage.setItem(VIEW_KEY, next);
        } catch {
            // Private window: the toggle still works, it just isn't remembered.
        }
    };

    const needle = term.trim().toLowerCase();
    const shown = products.filter(
        (p) => matchesStock(p, stock) && (!type || p.type === type) && (!needle || p.name.toLowerCase().includes(needle))
    );

    const totals = {
        active: products.filter((p) => p.is_active).length,
        units: products.reduce((sum, p) => sum + p.total_stock, 0),
        low: products.filter((p) => p.low_stock_count > 0).length,
        out: products.filter((p) => p.out_of_stock_count > 0).length,
    };

    const viewButton = (value, Icon, label) => (
        <button
            type="button"
            onClick={() => setView(value)}
            aria-label={label}
            title={label}
            aria-pressed={view === value}
            className={
                'rounded-md p-2 transition ' +
                (view === value
                    ? 'bg-volt-500 text-ink-900'
                    : 'text-white/50 hover:bg-white/[0.06] hover:text-white admin-light:text-ink-900/50 admin-light:hover:bg-ink-900/[0.06] admin-light:hover:text-ink-900')
            }
        >
            <Icon className="h-4 w-4" />
        </button>
    );

    return (
        <AdminLayout header="Products">
            <Head title="Admin · Products" />

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-white/40 admin-light:text-ink-900/50">
                    Apparel and accessories. Stock lives on each product's sizes and colours.
                </p>
                <PrimaryButton as="link" href={route('admin.products.create')} icon={PlusIcon}>
                    Add product
                </PrimaryButton>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatTile label="Products" value={products.length} hint={`${totals.active} active`} icon={TagIcon} />
                <StatTile label="Units in stock" value={totals.units.toLocaleString()} hint="across all variants" icon={CubeIcon} />
                <StatTile
                    label="Running low"
                    value={totals.low}
                    hint="products to restock"
                    tone={totals.low ? 'warning' : 'default'}
                    icon={ExclamationTriangleIcon}
                    onClick={() => setStock(stock === 'low' ? 'all' : 'low')}
                    active={stock === 'low'}
                />
                <StatTile
                    label="Sold out"
                    value={totals.out}
                    hint="have a variant at 0"
                    tone={totals.out ? 'danger' : 'default'}
                    icon={XCircleIcon}
                    onClick={() => setStock(stock === 'out' ? 'all' : 'out')}
                    active={stock === 'out'}
                />
            </div>

            <StockFilters term={term} onTermChange={setTerm} stock={stock} onStockChange={setStock} placeholder="Search products">
                <label htmlFor="type-filter" className="sr-only">
                    Type
                </label>
                <select id="type-filter" value={type} onChange={(e) => setType(e.target.value)} className={filterInputClasses}>
                    <option value="">All types</option>
                    {Object.entries(typeLabels).map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </select>
                <div className="flex gap-1 self-center rounded-md border border-white/10 p-1 admin-light:border-ink-900/10">
                    {viewButton('grid', Squares2x2Icon, 'Grid view')}
                    {viewButton('table', ListBulletIcon, 'Table view')}
                </div>
            </StockFilters>

            <p className="mb-3 text-xs text-white/35 admin-light:text-ink-900/45">
                Showing {shown.length} of {products.length}
            </p>

            {products.length === 0 ? (
                <Card className="px-6 py-12 text-center text-sm text-white/40 admin-light:text-ink-900/50">
                    No products yet.{' '}
                    <Link href={route('admin.products.create')} className="text-volt-500 hover:text-volt-400 admin-light:text-volt-800">
                        Create the first one
                    </Link>
                    .
                </Card>
            ) : shown.length === 0 ? (
                <Card className="px-6 py-12 text-center text-sm text-white/40 admin-light:text-ink-900/50">
                    No products match these filters.
                </Card>
            ) : view === 'grid' ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {shown.map((product) => (
                        <ProductCard key={product.id} product={product} typeLabels={typeLabels} />
                    ))}
                </div>
            ) : (
                <ProductTable products={shown} typeLabels={typeLabels} />
            )}
        </AdminLayout>
    );
}
