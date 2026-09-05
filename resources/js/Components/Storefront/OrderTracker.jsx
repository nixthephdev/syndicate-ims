/**
 * The customer's "where is my order?" strip — the fulfillment axis, which is
 * a different thing from the payment status chip sitting above it (one says
 * whether the money arrived, this says where the goods are).
 *
 * Steps come fully computed from Order::trackingPayload(); this deliberately
 * does no stage arithmetic of its own, so the admin's own tracker and this
 * one can never disagree about what "done" means.
 *
 * Renders nothing at all when `tracking` is null — an order nobody has paid
 * for has no journey yet, and an empty progress bar reads as "stuck".
 */
export default function OrderTracker({ tracking }) {
    if (!tracking) return null;

    const { steps } = tracking;

    return (
        <section className="border border-white/10 bg-white/[0.03] p-6 light:border-ink-900/10 light:bg-ink-900/[0.02]">
            <h2 className="font-display text-lg uppercase tracking-wide text-white light:text-ink-900">
                Order tracking
            </h2>
            <p className="mt-1 text-sm text-white/50 light:text-ink-900/60">
                {tracking.stage_label}
            </p>

            <ol className="mt-6 space-y-0">
                {steps.map((step, i) => {
                    const isLast = i === steps.length - 1;

                    return (
                        <li key={step.key} className="flex gap-4">
                            {/* Dot + the connector down to the next step. The
                                connector is coloured by THIS step's done
                                state, so the filled run always stops at the
                                current step rather than one past it. */}
                            <div className="flex flex-col items-center">
                                <span
                                    className={[
                                        'mt-1 h-3 w-3 shrink-0 rounded-full',
                                        step.done
                                            ? 'bg-volt-500'
                                            : 'bg-white/20 light:bg-ink-900/20',
                                        step.current
                                            ? 'ring-4 ring-volt-500/25'
                                            : '',
                                    ].join(' ')}
                                />
                                {!isLast && (
                                    <span
                                        className={[
                                            'w-px flex-1 min-h-[2rem]',
                                            steps[i + 1].done
                                                ? 'bg-volt-500'
                                                : 'bg-white/15 light:bg-ink-900/15',
                                        ].join(' ')}
                                    />
                                )}
                            </div>

                            <div className={isLast ? 'pb-0' : 'pb-6'}>
                                <p
                                    className={[
                                        'text-sm',
                                        step.current
                                            ? 'font-semibold text-white light:text-ink-900'
                                            : step.done
                                              ? 'text-white/70 light:text-ink-900/70'
                                              : 'text-white/35 light:text-ink-900/40',
                                    ].join(' ')}
                                >
                                    {step.label}
                                </p>
                                {step.current && (
                                    <p className="mt-0.5 text-xs uppercase tracking-widest text-volt-500 light:text-volt-800">
                                        Current
                                    </p>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}
