import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import OrderStatusBadge from '@/Components/Admin/OrderStatusBadge';
import PrimaryButton from '@/Components/Admin/PrimaryButton';
import SecondaryButton from '@/Components/Admin/SecondaryButton';
import {
    ArrowDownTrayIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    CheckCircleIcon,
    PhotoIcon,
    TruckIcon,
    XIcon,
} from '@/Components/Admin/icons';
import { HARDWARE_COLORS } from '@/Components/Customizer/hardwareColors';
import { useConfirm } from '@/Components/Admin/ConfirmDialog';
import { useLiveReload } from '@/utils/useLiveReload';
import { lazy, Suspense, useRef, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';

// The customizer's own 3D viewer, lazy-loaded so Three.js only downloads
// when an order actually has skateboard parts — same split as HeroBoard.
// Not a storefront-styled component: it is the model viewer itself.
const Scene = lazy(() => import('@/Components/Customizer/Scene'));

/** hardwareColors.js is a plain data module, not a styled component — safe
 *  to share with the admin panel per CLAUDE.md's "shared hooks/utilities
 *  are fine; shared presentational components are not" rule. */
function colorLabel(hex) {
    return HARDWARE_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.label ?? hex;
}

const fileSafe = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Saves whatever angle the board is at right now as a PNG (client,
 * 2026-10-31: "3d model picture can be exported"). The model's canvas is
 * transparent, so it's drawn onto a solid ground with the order number
 * underneath — a reference picture that still says which order it's for
 * once it's been saved somewhere else.
 */
function downloadBoardImage(container, orderNumber, build) {
    const source = container?.querySelector('canvas');
    if (!source) return;

    const out = document.createElement('canvas');
    out.width = source.width;
    out.height = source.height;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(source, 0, 0);

    const pad = Math.round(out.width * 0.025);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `600 ${Math.max(14, Math.round(out.width * 0.022))}px sans-serif`;
    ctx.fillText(`${orderNumber} · ${build.label}`, pad, out.height - pad);

    const link = document.createElement('a');
    link.download = `${orderNumber}-${fileSafe(build.label)}.png`;
    link.href = out.toDataURL('image/png');
    link.click();
}

/** One custom board, assembled in 3D, with its own download button. */
function BuildCard({ build, orderNumber }) {
    const viewer = useRef(null);

    return (
        <Card className="mt-6 overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-6 py-4 admin-light:border-ink-900/10">
                <div className="min-w-0">
                    <h2 className="font-semibold text-white admin-light:text-ink-900">{build.label}</h2>
                    <p className="mt-1 text-xs text-white/40 admin-light:text-ink-900/50">
                        {build.parts.join(' · ')}
                    </p>
                </div>
                <SecondaryButton
                    icon={ArrowDownTrayIcon}
                    onClick={() => downloadBoardImage(viewer.current, orderNumber, build)}
                >
                    Download image
                </SecondaryButton>
            </div>
            <div ref={viewer} className="relative h-80 bg-white/[0.02] admin-light:bg-ink-900/[0.03] sm:h-96">
                <Suspense
                    fallback={
                        <p className="flex h-full items-center justify-center text-xs uppercase tracking-widest text-white/30 admin-light:text-ink-900/40">
                            Loading model…
                        </p>
                    }
                >
                    <Scene
                        deckMeshName={build.deck_mesh}
                        wheelsMeshName={build.wheels_mesh}
                        trucksColor={build.trucks_color}
                        boltsColor={build.bolts_color}
                        transparentBackground
                        preserveDrawingBuffer
                        enablePan={false}
                        enableZoom={false}
                    />
                </Suspense>
            </div>
            <p className="border-t border-white/10 px-6 py-3 text-xs text-white/30 admin-light:border-ink-900/10 admin-light:text-ink-900/45">
                Drag to rotate — the download saves the angle you're looking at. Hardware colours are the ones the customer picked.
            </p>
        </Card>
    );
}

/**
 * The apparel in this order as photos — the 2D counterpart of the 3D
 * boards (client, 2026-10-31), so whoever packs it pulls the right design,
 * size and colour off the rack. Each photo downloads on its own.
 */
function ApparelCard({ apparel, orderNumber }) {
    return (
        <Card className="mt-6 overflow-hidden">
            <div className="border-b border-white/10 px-6 py-4 admin-light:border-ink-900/10">
                <h2 className="font-semibold text-white admin-light:text-ink-900">Apparel to pack</h2>
                <p className="mt-1 text-xs text-white/40 admin-light:text-ink-900/50">
                    Product photos for reference — pull the size and colour shown under each.
                </p>
            </div>
            <ul className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
                {apparel.map((item, i) => (
                    <li
                        key={i}
                        className="overflow-hidden rounded-md border border-white/10 admin-light:border-ink-900/10"
                    >
                        <div className="aspect-square bg-white/[0.03] admin-light:bg-ink-900/[0.03]">
                            {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center gap-2 text-white/25 admin-light:text-ink-900/30">
                                    <PhotoIcon className="h-8 w-8" />
                                    <span className="text-xs">No photo uploaded</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-start justify-between gap-2 p-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-white admin-light:text-ink-900">{item.name}</p>
                                <p className="mt-0.5 text-xs text-white/50 admin-light:text-ink-900/60">
                                    {[item.size, item.color].filter(Boolean).join(' · ')} · ×{item.quantity}
                                </p>
                            </div>
                            {item.image_url && (
                                <a
                                    href={item.image_url}
                                    download={`${orderNumber}-${fileSafe(item.name)}`}
                                    title="Download photo"
                                    aria-label={`Download photo of ${item.name}`}
                                    className="shrink-0 rounded-md border border-white/10 p-1.5 text-white/50 transition hover:border-white/25 hover:text-white admin-light:border-ink-900/10 admin-light:text-ink-900/50 admin-light:hover:text-ink-900"
                                >
                                    <ArrowDownTrayIcon className="h-4 w-4" />
                                </a>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </Card>
    );
}

export default function Show({ order, can }) {
    const [processing, setProcessing] = useState(false);
    const [confirmDialog, ask] = useConfirm();

    // A customer paying, or another staff member moving it along, shows up
    // here without a reload.
    useLiveReload(['order', 'can']);

    // router.patch, not useForm: there is no form state here, just a one-shot
    // transition. useForm's patch() sends its own `data` and ignores a `data`
    // option, which would post an empty status.
    const move = (status) => {
        router.patch(
            route('admin.orders.status.update', order.order_number),
            { status },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
            }
        );
    };

    // The fulfillment axis — a different column and a different controller
    // from move() above, which changes payment status.
    const advanceStage = (stage) => {
        router.patch(
            route('admin.orders.fulfillment.update', order.order_number),
            { stage },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
            }
        );
    };

    return (
        <AdminLayout header={`Order ${order.order_number}`}>
            <Head title={`Admin · ${order.order_number}`} />
            {confirmDialog}

            <Link
                href={route('admin.orders.index')}
                className="inline-flex items-center gap-1.5 text-sm text-volt-500 hover:text-volt-400 admin-light:text-volt-800 admin-light:hover:text-volt-800"
            >
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                All orders
            </Link>

            <div className="mt-4 grid gap-6 lg:grid-cols-3">
                {/* Items + totals */}
                <div className="lg:col-span-2">
                    <Card className="overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4 admin-light:border-ink-900/10">
                            <div className="flex items-center gap-3">
                                <h2 className="font-semibold text-white admin-light:text-ink-900">
                                    {order.order_number}
                                </h2>
                                <OrderStatusBadge status={order.status} />
                            </div>
                            <p className="text-sm text-white/40 admin-light:text-ink-900/50">
                                Placed {order.placed_at}
                            </p>
                        </div>

                        <table className="min-w-full divide-y divide-white/10 admin-light:divide-ink-900/10">
                            <thead className="bg-white/[0.04] admin-light:bg-ink-900/[0.04]">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40 admin-light:text-ink-900/50">
                                        Item
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40 admin-light:text-ink-900/50">
                                        Unit
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40 admin-light:text-ink-900/50">
                                        Qty
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/40 admin-light:text-ink-900/50">
                                        Line total
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10 admin-light:divide-ink-900/10">
                                {order.items.map((item, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4 text-sm font-medium text-white admin-light:text-ink-900">
                                            <span className="flex items-center gap-3">
                                                {item.image_url ? (
                                                    <img
                                                        src={item.image_url}
                                                        alt=""
                                                        className="h-10 w-10 shrink-0 rounded border border-white/10 bg-white/[0.03] object-cover admin-light:border-ink-900/10"
                                                    />
                                                ) : (
                                                    <span className="h-10 w-10 shrink-0 rounded border border-white/10 bg-white/[0.03] admin-light:border-ink-900/10 admin-light:bg-ink-900/[0.03]" />
                                                )}
                                                <span>
                                            {item.name}
                                            {item.color && (
                                                <span className="ml-2 inline-flex items-center gap-1.5 text-xs font-normal text-white/40 admin-light:text-ink-900/50">
                                                    <span
                                                        className="h-2.5 w-2.5 rounded-full border border-white/15 admin-light:border-ink-900/15"
                                                        style={{ backgroundColor: item.color }}
                                                    />
                                                    {colorLabel(item.color)} requested
                                                </span>
                                            )}
                                                </span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-white/40 admin-light:text-ink-900/50">
                                            {item.unit_price_formatted}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-white/40 admin-light:text-ink-900/50">
                                            {item.quantity}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-white admin-light:text-ink-900">
                                            {item.line_total_formatted}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-white/[0.04] admin-light:bg-ink-900/[0.04]">
                                <tr>
                                    <td
                                        colSpan={3}
                                        className="px-6 py-3 text-right text-sm font-medium text-white/50 admin-light:text-ink-900/60"
                                    >
                                        Total
                                    </td>
                                    <td className="px-6 py-3 text-right text-base font-semibold text-white admin-light:text-ink-900">
                                        {order.total_formatted}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>

                        <p className="border-t border-white/10 bg-white/[0.04] px-6 py-3 text-xs text-white/40 admin-light:border-ink-900/10 admin-light:bg-ink-900/[0.04] admin-light:text-ink-900/50">
                            Item names and prices are snapshots taken when the
                            order was placed — they do not change if the product
                            is later renamed or repriced.
                        </p>
                    </Card>

                    {/* The skateboard parts above, assembled — one model per
                        custom board. See Admin\OrderController::builds(). */}
                    {order.builds.map((build) => (
                        <BuildCard key={build.key} build={build} orderNumber={order.order_number} />
                    ))}

                    {order.apparel.length > 0 && (
                        <ApparelCard apparel={order.apparel} orderNumber={order.order_number} />
                    )}
                </div>

                {/* Customer + actions */}
                <div className="space-y-6">
                    <Card className="p-6">
                        <h2 className="text-sm font-semibold text-white admin-light:text-ink-900">Customer</h2>
                        <dl className="mt-3 space-y-2 text-sm">
                            <div>
                                <dt className="sr-only">Name</dt>
                                <dd className="text-white admin-light:text-ink-900">{order.customer_name}</dd>
                            </div>
                            <div>
                                <dt className="sr-only">Email</dt>
                                <dd className="text-white/40 admin-light:text-ink-900/50">{order.customer_email}</dd>
                            </div>
                            <div>
                                <dt className="sr-only">Phone</dt>
                                <dd className="text-white/40 admin-light:text-ink-900/50">{order.customer_phone}</dd>
                            </div>
                        </dl>

                        {order.address.has_address && (
                            <div className="mt-4 border-t border-white/10 pt-4 admin-light:border-ink-900/10">
                                <p className="text-xs font-medium uppercase tracking-wide text-white/25 admin-light:text-ink-900/35">
                                    Delivery address
                                </p>
                                <div className="mt-1 text-sm text-white/60 admin-light:text-ink-900/70">
                                    {order.address.address_line && <p>{order.address.address_line}</p>}
                                    <p>{[order.address.barangay, order.address.city].filter(Boolean).join(', ')}</p>
                                    <p>{[order.address.province, order.address.postal_code].filter(Boolean).join(' ')}</p>
                                </div>
                            </div>
                        )}

                        {order.notes && (
                            <div className="mt-4 border-t border-white/10 pt-4 admin-light:border-ink-900/10">
                                <p className="text-xs font-medium uppercase tracking-wide text-white/25 admin-light:text-ink-900/35">
                                    Notes
                                </p>
                                <p className="mt-1 text-sm italic text-white/50 admin-light:text-ink-900/60">
                                    "{order.notes}"
                                </p>
                            </div>
                        )}

                        {order.account && (
                            <p className="mt-4 border-t border-white/10 pt-4 text-xs text-white/25 admin-light:border-ink-900/10 admin-light:text-ink-900/35">
                                Account: {order.account.name} ({order.account.role})
                            </p>
                        )}
                    </Card>

                    <Card className="p-6">
                        <h2 className="text-sm font-semibold text-white admin-light:text-ink-900">Payment</h2>
                        <p className="mt-2 text-sm capitalize text-white/60 admin-light:text-ink-900/70">
                            {order.fulfillment_method}
                            {' · '}
                            {order.payment_method_label}
                            {order.requires_deposit ? ' · 50% deposit' : ''}
                        </p>
                        {order.deposit_formatted && (
                            <p className="mt-1 text-xs text-white/40 admin-light:text-ink-900/50">
                                Deposit {order.deposit_formatted} · Balance {order.balance_formatted}
                                {order.balance_paid_at
                                    ? ` (paid by GCash ${order.balance_paid_at})`
                                    : order.status === 'deposit_paid'
                                      ? order.fulfillment_method === 'delivery'
                                          ? ' (due — GCash, or cash on delivery)'
                                          : ' (due by GCash before pickup)'
                                      : ''}
                            </p>
                        )}
                        <p className="mt-2 text-sm text-white/50 admin-light:text-ink-900/60">
                            {order.is_paid
                                ? `Paid ${order.paid_at}`
                                : 'Not paid yet.'}
                        </p>
                        <p className="mt-2 text-xs text-white/40 admin-light:text-ink-900/50">
                            {order.stock_committed
                                ? 'Stock for this order has been deducted.'
                                : 'No stock has been deducted for this order.'}
                        </p>

                        {/* PayMongo's ids — what to search for in the PayMongo
                            dashboard if a customer disputes a payment. */}
                        {order.paymongo.payment_intent_id && (
                            <dl className="mt-4 space-y-1 border-t border-white/10 pt-4 text-xs admin-light:border-ink-900/10">
                                <div>
                                    <dt className="inline text-white/40 admin-light:text-ink-900/50">Intent </dt>
                                    <dd className="inline font-mono text-white/60 admin-light:text-ink-900/70">
                                        {order.paymongo.payment_intent_id}
                                    </dd>
                                </div>
                                {order.paymongo.balance_payment_id && (
                                    <div>
                                        <dt className="inline text-white/40 admin-light:text-ink-900/50">Balance payment </dt>
                                        <dd className="inline font-mono text-white/60 admin-light:text-ink-900/70">
                                            {order.paymongo.balance_payment_id}
                                        </dd>
                                    </div>
                                )}
                                {order.paymongo.payment_id && (
                                    <div>
                                        <dt className="inline text-white/40 admin-light:text-ink-900/50">Payment </dt>
                                        <dd className="inline font-mono text-white/60 admin-light:text-ink-900/70">
                                            {order.paymongo.payment_id}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        )}
                        {order.pays_online && !order.is_paid && (
                            <p className="mt-3 text-xs text-white/30 admin-light:text-ink-900/45">
                                Paid by GCash through PayMongo — this marks itself
                                paid when the customer completes payment.
                            </p>
                        )}
                    </Card>

                    {/* Where the order physically is. Separate card from
                        Actions because it's a separate axis from payment —
                        see Admin\OrderFulfillmentController. */}
                    {order.tracking && (
                        <Card className="p-6">
                            <h2 className="text-sm font-semibold text-white admin-light:text-ink-900">
                                Fulfillment
                            </h2>
                            <p className="mt-1 text-xs uppercase tracking-widest text-volt-500 admin-light:text-volt-800">
                                {order.tracking.stage_label}
                            </p>

                            <ol className="mt-4 space-y-2">
                                {order.tracking.steps.map((step) => (
                                    <li key={step.key} className="flex items-center gap-2.5">
                                        <span
                                            className={
                                                'h-2 w-2 shrink-0 rounded-full ' +
                                                (step.done
                                                    ? 'bg-volt-500'
                                                    : 'bg-white/20 admin-light:bg-ink-900/20')
                                            }
                                        />
                                        <span
                                            className={
                                                'text-xs ' +
                                                (step.current
                                                    ? 'font-semibold text-white admin-light:text-ink-900'
                                                    : step.done
                                                      ? 'text-white/60 admin-light:text-ink-900/65'
                                                      : 'text-white/30 admin-light:text-ink-900/40')
                                            }
                                        >
                                            {step.label}
                                        </span>
                                    </li>
                                ))}
                            </ol>

                            {/* No cash at pickup: the last step waits for the
                                customer's GCash balance payment. Live reload
                                brings the button back the moment it lands. */}
                            {order.tracking.next_stage === 'completed' && order.balance_blocks_handover ? (
                                <p className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-300 admin-light:text-amber-800">
                                    Waiting for the {order.balance_formatted} balance. The customer pays it by
                                    GCash from their order page — hand the order over once it comes in.
                                </p>
                            ) : order.tracking.next_stage && (
                                <PrimaryButton
                                    className="mt-4 w-full justify-center"
                                    disabled={processing}
                                    onClick={() =>
                                        ask(
                                            {
                                                title: `Mark as ${order.tracking.next_stage_label}?`,
                                                message:
                                                    'The customer sees this on their order page. Stages only move forward, so this cannot be undone.',
                                                confirmLabel: `Mark as ${order.tracking.next_stage_label}`,
                                            },
                                            () => advanceStage(order.tracking.next_stage)
                                        )
                                    }
                                    icon={
                                        order.tracking.next_stage === 'completed'
                                            ? CheckCircleIcon
                                            : TruckIcon
                                    }
                                >
                                    Mark as {order.tracking.next_stage_label}
                                </PrimaryButton>
                            )}
                        </Card>
                    )}

                    {(can.fulfil || can.cancel) && (
                        <Card className="p-6">
                            <h2 className="text-sm font-semibold text-white admin-light:text-ink-900">Actions</h2>

                            {/* Skip-to-done. Hidden when the tracker's own
                                next step already IS "completed", or the two
                                buttons would be the same action twice. */}
                            {can.fulfil && order.tracking?.next_stage !== 'completed' && (
                                <SecondaryButton
                                    className="mt-3 w-full"
                                    disabled={processing}
                                    onClick={() =>
                                        ask(
                                            {
                                                title: 'Mark this order fulfilled?',
                                                message:
                                                    order.status === 'deposit_paid'
                                                        ? `This skips the remaining stages and confirms the ${order.balance_formatted} cash balance was collected.`
                                                        : 'This skips the remaining stages and closes the order.',
                                                confirmLabel: 'Mark fulfilled',
                                            },
                                            () => move('fulfilled')
                                        )
                                    }
                                    icon={ArrowRightIcon}
                                >
                                    Skip to fulfilled
                                </SecondaryButton>
                            )}

                            {can.fulfil && order.status === 'deposit_paid' && (
                                <p className="mt-2 text-xs text-white/25 admin-light:text-ink-900/35">
                                    Marking this {order.fulfillment_method === 'delivery' ? 'delivered' : 'picked up'}{' '}
                                    confirms the {order.balance_formatted} cash
                                    balance was collected.
                                </p>
                            )}

                            {can.cancel && (
                                <SecondaryButton
                                    className="mt-3 w-full"
                                    disabled={processing}
                                    onClick={() =>
                                        ask(
                                            {
                                                title: `Cancel ${order.order_number}?`,
                                                message: 'The customer will see this order as cancelled. This cannot be undone.',
                                                confirmLabel: 'Cancel order',
                                                danger: true,
                                            },
                                            () => move('cancelled')
                                        )
                                    }
                                    icon={XIcon}
                                >
                                    Cancel order
                                </SecondaryButton>
                            )}

                            {/* A paid order cannot be cancelled here: that needs
                                the stock putting back and the money refunding,
                                and neither path exists yet. */}
                            {order.stock_committed && (
                                <p className="mt-3 text-xs text-white/25 admin-light:text-ink-900/35">
                                    Paid orders can't be cancelled here — that
                                    needs a refund and a restock, which aren't
                                    built yet.
                                </p>
                            )}
                        </Card>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
