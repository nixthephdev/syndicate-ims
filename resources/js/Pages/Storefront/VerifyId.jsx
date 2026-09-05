import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';

/**
 * Buyer ID verification, customer side. One photo, one type, then a human
 * looks at it — see Shop\IdVerificationController.
 *
 * The four statuses are genuinely four different pages: nothing submitted
 * (upload form), waiting (no form at all — a second upload would just push
 * them back in the queue), approved (done, and deliberately not
 * re-submittable), rejected (the reason, then the form again).
 */
const STATUS_STYLES = {
    approved: 'bg-volt-500 text-ink-900',
    pending: 'bg-amber-400 text-ink-900',
    rejected: 'bg-red-500 text-white',
    none: 'bg-white/15 text-white light:bg-ink-900/10 light:text-ink-900',
};

export default function VerifyId({
    status,
    id_type,
    id_type_label,
    submitted_at,
    reviewed_at,
    rejection_reason,
    id_types,
    photo_url,
}) {
    const [preview, setPreview] = useState(null);

    const { data, setData, post, processing, errors, progress } = useForm({
        id_type: id_type ?? '',
        photo: null,
    });

    const pickPhoto = (e) => {
        const file = e.target.files[0] ?? null;
        setData('photo', file);
        // Local object URL, same client-side preview the admin's product
        // photo input already uses — nothing is uploaded until submit.
        setPreview(file ? URL.createObjectURL(file) : null);
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('verify-id.store'), { forceFormData: true });
    };

    const showForm = status !== 'approved' && status !== 'pending';

    return (
        <StorefrontLayout>
            <Head title="Verify your ID" />

            <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
                <Link
                    href={route('dashboard')}
                    className="font-display text-xs uppercase tracking-[0.25em] text-white/30 transition-colors hover:text-volt-500 light:text-ink-900/45 light:hover:text-volt-800"
                >
                    ← Account
                </Link>

                <div className="mt-6 flex flex-wrap items-center gap-4">
                    <h1 className="font-display text-[clamp(1.75rem,6vw,3rem)] uppercase leading-[0.9] tracking-tighter text-white light:text-ink-900">
                        Verify your ID
                    </h1>
                    <span
                        className={
                            'px-3 py-1 font-display text-xs uppercase tracking-[0.2em] ' +
                            (STATUS_STYLES[status] ?? STATUS_STYLES.none)
                        }
                    >
                        {status === 'none' ? 'Not submitted' : status}
                    </span>
                </div>

                {status === 'approved' && (
                    <div className="mt-8 border border-volt-500/40 bg-volt-500/[0.06] p-6">
                        <h2 className="font-display text-lg uppercase text-white light:text-ink-900">
                            You're verified
                        </h2>
                        <p className="mt-2 text-sm text-white/60 light:text-ink-900/70">
                            We checked your {id_type_label} on {reviewed_at}. You can
                            order normally — nothing else is needed.
                        </p>
                        <Link
                            href={route('shop.index')}
                            className="mt-5 inline-flex items-center gap-2 bg-volt-500 px-6 py-3 font-display text-sm uppercase tracking-[0.2em] text-ink-900 transition-all hover:-translate-y-0.5 hover:bg-white light:hover:bg-ink-900 light:hover:text-white"
                        >
                            Start shopping →
                        </Link>
                    </div>
                )}

                {status === 'pending' && (
                    <div className="mt-8 border border-amber-400/40 bg-amber-400/[0.06] p-6">
                        <h2 className="font-display text-lg uppercase text-white light:text-ink-900">
                            With our team
                        </h2>
                        <p className="mt-2 text-sm text-white/60 light:text-ink-900/70">
                            You sent your {id_type_label} on {submitted_at}. Someone
                            will check it shortly — you'll be able to order as soon as
                            it's approved. Nothing more to do for now.
                        </p>
                    </div>
                )}

                {status === 'rejected' && (
                    <div className="mt-8 border border-red-500/40 bg-red-500/[0.06] p-6">
                        <h2 className="font-display text-lg uppercase text-white light:text-ink-900">
                            We couldn't accept that one
                        </h2>
                        <p className="mt-2 text-sm text-white/60 light:text-ink-900/70">
                            {rejection_reason}
                        </p>
                        <p className="mt-3 text-sm text-white/40 light:text-ink-900/55">
                            Upload another photo below and we'll take another look.
                        </p>
                    </div>
                )}

                {showForm && (
                    <>
                        {status === 'none' && (
                            <p className="mt-6 max-w-prose text-sm leading-relaxed text-white/50 light:text-ink-900/65">
                                We check every buyer's ID before their first order. Pick
                                what you're sending and upload a clear photo — all four
                                corners visible and the text readable. It's only ever
                                seen by our staff.
                            </p>
                        )}

                        <form onSubmit={submit} className="mt-8 space-y-6">
                            <div>
                                <label
                                    htmlFor="id_type"
                                    className="block font-display text-xs uppercase tracking-[0.2em] text-white/50 light:text-ink-900/65"
                                >
                                    ID type
                                </label>
                                <select
                                    id="id_type"
                                    value={data.id_type}
                                    onChange={(e) => setData('id_type', e.target.value)}
                                    className="mt-2 w-full border-2 border-white/15 bg-transparent px-4 py-3 text-white focus:border-volt-500 focus:outline-none focus:ring-0 light:border-ink-900/15 light:text-ink-900"
                                >
                                    <option value="" className="bg-ink-900 text-white">
                                        Choose an ID…
                                    </option>
                                    {Object.entries(id_types).map(([value, label]) => (
                                        <option
                                            key={value}
                                            value={value}
                                            className="bg-ink-900 text-white"
                                        >
                                            {label}
                                        </option>
                                    ))}
                                </select>
                                {errors.id_type && (
                                    <p className="mt-2 text-sm text-red-400">{errors.id_type}</p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="photo"
                                    className="block font-display text-xs uppercase tracking-[0.2em] text-white/50 light:text-ink-900/65"
                                >
                                    Photo of your ID
                                </label>
                                <input
                                    id="photo"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={pickPhoto}
                                    className="mt-2 w-full border-2 border-white/15 bg-transparent px-4 py-3 text-sm text-white/70 file:mr-4 file:border-0 file:bg-volt-500 file:px-4 file:py-2 file:font-display file:text-xs file:uppercase file:tracking-[0.15em] file:text-ink-900 light:border-ink-900/15 light:text-ink-900/70"
                                />
                                <p className="mt-2 text-xs text-white/30 light:text-ink-900/45">
                                    JPG, PNG or WEBP · up to 4MB
                                </p>
                                {errors.photo && (
                                    <p className="mt-2 text-sm text-red-400">{errors.photo}</p>
                                )}
                                {errors.id && (
                                    <p className="mt-2 text-sm text-red-400">{errors.id}</p>
                                )}
                            </div>

                            {preview && (
                                <div>
                                    <p className="font-display text-xs uppercase tracking-[0.2em] text-white/50 light:text-ink-900/65">
                                        Check it's readable
                                    </p>
                                    <img
                                        src={preview}
                                        alt="The ID you selected"
                                        className="mt-2 max-h-72 border border-white/10 object-contain light:border-ink-900/10"
                                    />
                                </div>
                            )}

                            {progress && (
                                <div className="h-1 w-full bg-white/10 light:bg-ink-900/10">
                                    <div
                                        className="h-1 bg-volt-500 transition-all"
                                        style={{ width: `${progress.percentage}%` }}
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={processing || !data.photo || !data.id_type}
                                className="inline-flex w-full items-center justify-center gap-3 bg-volt-500 px-8 py-4 font-display text-base uppercase tracking-[0.2em] text-ink-900 transition-all hover:-translate-y-0.5 hover:bg-white light:hover:bg-ink-900 light:hover:text-white disabled:pointer-events-none disabled:opacity-30"
                            >
                                {processing ? 'Sending' : 'Submit for review'}
                            </button>
                        </form>
                    </>
                )}

                {photo_url && (
                    <p className="mt-8 text-xs text-white/30 light:text-ink-900/45">
                        <a
                            href={photo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-4 hover:text-volt-500 light:hover:text-volt-800"
                        >
                            View the photo we currently have
                        </a>
                    </p>
                )}
            </div>
        </StorefrontLayout>
    );
}
