/**
 * Money is stored and passed around as integer centavos, everywhere, always
 * (see CLAUDE.md). This is the ONLY place it becomes pesos, and only for
 * display. Never send the output of this back to the server, and never do
 * arithmetic on it — do the maths in centavos and format at the end.
 */

const formatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
});

export function formatCentavos(centavos) {
    return formatter.format((Number(centavos) || 0) / 100);
}

/**
 * A product whose variants are all one price shows one price; a product with
 * per-variant overrides shows a range. Passing both ends and deciding here
 * keeps that rule in one place rather than in every page that lists products.
 */
export function formatPriceRange(fromCentavos, toCentavos) {
    if (!toCentavos || fromCentavos === toCentavos) {
        return formatCentavos(fromCentavos);
    }

    return `${formatCentavos(fromCentavos)} – ${formatCentavos(toCentavos)}`;
}
