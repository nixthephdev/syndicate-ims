import FilterTab from './FilterTabs';

export const STOCK_FILTERS = {
    all: 'All',
    low: 'Low stock',
    out: 'Out of stock',
};

const inputClasses =
    'rounded-md border-white/15 bg-ink-900 text-sm text-white shadow-sm placeholder-white/30 focus:border-volt-500 focus:ring-volt-500 admin-light:border-ink-900/15 admin-light:bg-white admin-light:text-ink-900 admin-light:placeholder-ink-900/30';

/**
 * Search box + stock-status pills for the two inventory lists (Products,
 * Skate Components). Filtering itself happens in each page — both already
 * hold their whole list client-side, so there is no query to send.
 * `children` is for page-specific extras (Products' type picker).
 */
export default function StockFilters({ term, onTermChange, stock, onStockChange, placeholder, children }) {
    return (
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1">
                {Object.entries(STOCK_FILTERS).map(([key, label]) => (
                    <FilterTab key={key} active={stock === key} onClick={() => onStockChange(key)}>
                        {label}
                    </FilterTab>
                ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
                {children}
                <label htmlFor="stock-search" className="sr-only">
                    Search
                </label>
                <input
                    id="stock-search"
                    type="search"
                    value={term}
                    onChange={(e) => onTermChange(e.target.value)}
                    placeholder={placeholder}
                    className={`w-full sm:w-64 ${inputClasses}`}
                />
            </div>
        </div>
    );
}

export { inputClasses as filterInputClasses };
