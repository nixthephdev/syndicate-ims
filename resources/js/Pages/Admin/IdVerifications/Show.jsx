import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PrimaryButton from '@/Components/Admin/PrimaryButton';
import SecondaryButton from '@/Components/Admin/SecondaryButton';
import IdStatusBadge from '@/Components/Admin/IdStatusBadge';
import { ArrowLeftIcon, CheckCircleIcon, XIcon } from '@/Components/Admin/icons';

/**
 * Where a human actually looks at the ID and decides.
 *
 * The photo is an <img> pointed at a streamed, authorised-only route — it is
 * NOT a file under public/, so there is no URL anyone else can share or
 * guess. See Shop\IdVerificationController::show().
 *
 * Rejecting reveals a required reason box rather than firing straight away:
 * the customer is shown that text verbatim, and a rejection with nothing to
 * act on just becomes a support message.
 */
export default function Show({ customer, can_review }) {
    const [rejecting, setRejecting] = useState(false);
    const [reason, setReason] = useState('');
    const [processing, setProcessing] = useState(false);

    const decide = (decision) => {
        router.patch(
            route('admin.id-verifications.update', customer.id),
            { decision, reason: decision === 'reject' ? reason : null },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => {
                    setProcessing(false);
                    setRejecting(false);
                    setReason('');
                },
            }
        );
    };

    return (
        <AdminLayout header={`ID · ${customer.name}`}>
            <Head title={`Admin · ID · ${customer.name}`} />

            <Link
                href={route('admin.id-verifications.index')}
                className="mb-6 inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-volt-500 admin-light:text-ink-900/60 admin-light:hover:text-volt-800"
            >
                <ArrowLeftIcon className="h-4 w-4" />
                Back to queue
            </Link>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* The photo. Biggest thing on the page — it's the job. */}
                <div className="lg:col-span-2">
                    <Card className="p-6">
                        <h2 className="text-sm font-semibold text-white admin-light:text-ink-900">
                            Submitted ID
                        </h2>

                        {customer.photo_url ? (
                            <a
                                href={customer.photo_url}
                                target="_blank"
                                rel="noreferrer"
                                title="Open full size in a new tab"
                            >
                                <img
                                    src={customer.photo_url}
                                    alt={`${customer.name}'s submitted ID`}
                                    className="mt-4 w-full rounded-md border border-white/10 bg-black/20 object-contain admin-light:border-ink-900/10 admin-light:bg-ink-900/[0.03]"
                                />
                            </a>
                        ) : (
                            <p className="mt-4 rounded-md border border-dashed border-white/10 px-6 py-12 text-center text-sm text-white/40 admin-light:border-ink-900/15 admin-light:text-ink-900/55">
                                This customer hasn't uploaded anything yet.
                            </p>
                        )}

                        {customer.photo_url && (
                            <p className="mt-3 text-xs text-white/25 admin-light:text-ink-900/40">
                                Click to open full size. Check the name matches the
                                account, the photo is legible, and it hasn't expired.
                            </p>
                        )}
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-6">
                        <h2 className="text-sm font-semibold text-white admin-light:text-ink-900">
                            Customer
                        </h2>
                        <dl className="mt-4 space-y-3 text-sm">
                            {[
                                ['Name', customer.name],
                                ['Email', customer.email],
                                ['ID type', customer.id_type_label ?? '—'],
                                ['Submitted', customer.submitted_at ?? '—'],
                                ['Orders', customer.orders_count],
                                ['Joined', customer.joined_at],
                            ].map(([label, value]) => (
                                <div key={label} className="flex justify-between gap-4">
                                    <dt className="text-white/40 admin-light:text-ink-900/55">
                                        {label}
                                    </dt>
                                    <dd className="text-right text-white/80 admin-light:text-ink-900/80">
                                        {value}
                                    </dd>
                                </div>
                            ))}
                            <div className="flex justify-between gap-4 pt-1">
                                <dt className="text-white/40 admin-light:text-ink-900/55">
                                    Status
                                </dt>
                                <dd>
                                    <IdStatusBadge status={customer.status} />
                                </dd>
                            </div>
                        </dl>

                        {customer.status === 'rejected' && customer.rejection_reason && (
                            <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/[0.06] p-3">
                                <p className="text-xs uppercase tracking-widest text-red-400">
                                    Rejected — reason given
                                </p>
                                <p className="mt-1 text-sm text-white/70 admin-light:text-ink-900/75">
                                    {customer.rejection_reason}
                                </p>
                            </div>
                        )}

                        {customer.reviewed_at && (
                            <p className="mt-4 text-xs text-white/25 admin-light:text-ink-900/40">
                                Last reviewed {customer.reviewed_at}
                                {customer.reviewed_by && ` by ${customer.reviewed_by}`}.
                            </p>
                        )}
                    </Card>

                    {can_review && (
                        <Card className="p-6">
                            <h2 className="text-sm font-semibold text-white admin-light:text-ink-900">
                                Decision
                            </h2>

                            {!rejecting ? (
                                <>
                                    <PrimaryButton
                                        className="mt-3 w-full justify-center"
                                        disabled={processing}
                                        onClick={() => decide('approve')}
                                        icon={CheckCircleIcon}
                                    >
                                        Approve
                                    </PrimaryButton>
                                    <SecondaryButton
                                        className="mt-3 w-full"
                                        disabled={processing}
                                        onClick={() => setRejecting(true)}
                                        icon={XIcon}
                                    >
                                        Reject
                                    </SecondaryButton>
                                    <p className="mt-3 text-xs text-white/25 admin-light:text-ink-900/40">
                                        Approving lets this customer place orders.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <label
                                        htmlFor="reason"
                                        className="mt-3 block text-xs uppercase tracking-widest text-white/40 admin-light:text-ink-900/55"
                                    >
                                        Why? The customer sees this
                                    </label>
                                    <textarea
                                        id="reason"
                                        rows={3}
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        maxLength={500}
                                        placeholder="e.g. The photo is too blurry to read the name."
                                        className="mt-2 w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-white/25 focus:border-volt-500 focus:outline-none focus:ring-0 admin-light:border-ink-900/15 admin-light:bg-white admin-light:text-ink-900 admin-light:placeholder-ink-900/35"
                                    />
                                    <PrimaryButton
                                        className="mt-3 w-full justify-center"
                                        disabled={processing || reason.trim() === ''}
                                        onClick={() => decide('reject')}
                                        icon={XIcon}
                                    >
                                        Confirm rejection
                                    </PrimaryButton>
                                    <SecondaryButton
                                        className="mt-3 w-full"
                                        disabled={processing}
                                        onClick={() => setRejecting(false)}
                                    >
                                        Cancel
                                    </SecondaryButton>
                                </>
                            )}
                        </Card>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
