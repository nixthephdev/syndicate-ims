import { formatCentavos } from '@/utils/money';

/**
 * A grid of selectable parts — used for both deck and wheel choices. Options
 * stay visible even when sold out (disabled, not hidden), matching the same
 * choice made on the product page: hiding a size/option makes the grid
 * jump and leaves the shopper wondering whether it exists at all.
 */
export default function PartPicker({ label, options, selectedId, onSelect }) {
    return (
        <fieldset>
            <legend className="mb-3 font-display text-xs uppercase tracking-[0.25em] text-white/50">
                {label}
            </legend>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {options.map((option) => {
                    const active = option.id === selectedId;
                    const disabled = option.is_out_of_stock;

                    return (
                        <button
                            key={option.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => onSelect(option.id)}
                            aria-pressed={active}
                            title={disabled ? 'Sold out' : undefined}
                            className={
                                'flex flex-col items-start gap-1 border-2 px-3 py-3 text-left transition-colors ' +
                                (disabled
                                    ? 'cursor-not-allowed border-white/10 opacity-40'
                                    : active
                                    ? 'border-volt-500 bg-volt-500/10'
                                    : 'border-white/15 hover:border-volt-500')
                            }
                        >
                            <span className="font-display text-xs uppercase leading-tight tracking-wide text-white">
                                {option.name}
                            </span>
                            <span className="font-display text-sm text-volt-500">
                                {formatCentavos(option.price_centavos)}
                            </span>
                            {(disabled || option.is_low_stock) && (
                                <span className="text-[10px] uppercase tracking-[0.15em] text-white/40">
                                    {disabled ? 'Sold out' : 'Low stock'}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </fieldset>
    );
}
