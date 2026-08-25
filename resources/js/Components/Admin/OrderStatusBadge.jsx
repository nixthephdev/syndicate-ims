/**
 * Order status pill. Like StockBadge, these colours sit outside the brand-blue
 * accent on purpose — they carry meaning (needs chasing / needs handing over /
 * done / dead) and must stay legible whatever the brand accent becomes.
 */
const STYLES = {
    pending: 'bg-gray-100 text-gray-600 ring-gray-500/20',
    awaiting_payment: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    paid: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    fulfilled: 'bg-green-50 text-green-700 ring-green-600/20',
    cancelled: 'bg-gray-100 text-gray-500 ring-gray-400/20',
    failed: 'bg-red-50 text-red-700 ring-red-600/20',
};

export default function OrderStatusBadge({ status }) {
    return (
        <span
            className={
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ' +
                (STYLES[status] ?? STYLES.pending)
            }
        >
            {status.replace(/_/g, ' ')}
        </span>
    );
}
