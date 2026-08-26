/**
 * Order status chip styling — was duplicated byte-for-byte across Account,
 * Orders/Index and Orders/Show. Extracted here while adding light-mode
 * pairing, since the six entries need two different treatments and fixing
 * that independently in three places was a drift risk:
 *
 * `paid`/`fulfilled`/`awaiting_payment`/`failed` are saturated colour FILLS
 * (volt/amber/red) with dark or white text on top — contrast is invariant to
 * the surrounding page, so these carry no `light:` pairing, same rule as
 * every other button/badge in the storefront (see tailwind.config.js).
 *
 * `pending`/`cancelled` are neutral chips built from `white/NN` opacity, not
 * a brand-colour fill — these DO need the alpha-boosted light pairing, or
 * they'd render as a near-invisible pale chip on the light background.
 */
const STATUS_STYLES = {
    paid: 'bg-volt-500 text-ink-900',
    fulfilled: 'bg-volt-500 text-ink-900',
    awaiting_payment: 'bg-amber-400 text-ink-900',
    pending: 'bg-white/15 text-white light:bg-ink-900/10 light:text-ink-900',
    cancelled: 'bg-white/10 text-white/50 light:bg-ink-900/[0.06] light:text-ink-900/60',
    failed: 'bg-red-500 text-white',
};

const FALLBACK = 'bg-white/15 text-white light:bg-ink-900/10 light:text-ink-900';

export function statusChipClasses(status) {
    return STATUS_STYLES[status] ?? FALLBACK;
}

export function formatStatusLabel(status) {
    return status.replace(/_/g, ' ');
}
