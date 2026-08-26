import { HARDWARE_COLORS } from './hardwareColors';

/**
 * A row of colour swatches — used for Bolts/Trucks, which (unlike Deck and
 * Wheels) are a free cosmetic recolour of one fixed physical part, not a
 * choice between separately priced/stocked components. No price, no stock
 * state, no sold-out handling: there is nothing here to run out of.
 */
export default function ColorSwatchPicker({ label, value, onChange }) {
    return (
        <fieldset>
            <legend className="mb-3 font-display text-xs uppercase tracking-[0.25em] text-white/50 light:text-ink-900/65">
                {label}
            </legend>

            <div className="flex flex-wrap gap-2">
                {HARDWARE_COLORS.map((color) => {
                    const active = color.hex === value;

                    return (
                        <button
                            key={color.hex}
                            type="button"
                            title={color.label}
                            aria-label={color.label}
                            aria-pressed={active}
                            onClick={() => onChange(color.hex)}
                            className={
                                'h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ' +
                                (active
                                    ? 'border-volt-500 light:border-volt-800'
                                    : 'border-white/20 light:border-ink-900/20')
                            }
                            style={{ backgroundColor: color.hex }}
                        />
                    );
                })}
            </div>
        </fieldset>
    );
}
