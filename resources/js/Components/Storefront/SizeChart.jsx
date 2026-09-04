import { useState } from 'react';
import Modal from './Modal';

/**
 * Generic, clearly-labelled reference measurements — not a fact about this
 * shop's actual garments (no manufacturer numbers exist yet, confirmed with
 * the client), just standard oversized/boxy-fit streetwear sizing so a
 * shopper has SOMETHING to judge fit by. Swap for real numbers once they
 * exist; don't present these as exact.
 */
const CHARTS = {
    tee: {
        label: 'Tee',
        note: 'Boxy, slightly oversized fit — sized up from a standard tee.',
        rows: [
            { size: 'S', chest: 56, length: 68, sleeve: 22 },
            { size: 'M', chest: 58, length: 70, sleeve: 23 },
            { size: 'L', chest: 60, length: 72, sleeve: 24 },
            { size: 'XL', chest: 62, length: 74, sleeve: 25 },
        ],
    },
    hoodie: {
        label: 'Hoodie',
        note: 'Oversized fit — roomy through the body and sleeve.',
        rows: [
            { size: 'S', chest: 60, length: 66, sleeve: 60 },
            { size: 'M', chest: 62, length: 68, sleeve: 62 },
            { size: 'L', chest: 64, length: 70, sleeve: 64 },
            { size: 'XL', chest: 66, length: 72, sleeve: 66 },
        ],
    },
};

/** Caps/accessories are "One Size" — a chart doesn't apply, so this just
 *  renders nothing rather than making every call site guard it. */
export default function SizeChart({ type }) {
    const [open, setOpen] = useState(false);
    const chart = CHARTS[type];

    if (!chart) return null;

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="font-display text-[11px] uppercase tracking-[0.2em] text-white/40 underline underline-offset-4 transition-colors hover:text-volt-500 light:text-ink-900/55 light:hover:text-volt-800"
            >
                Size guide
            </button>

            <Modal show={open} onClose={() => setOpen(false)}>
                <div className="p-6 sm:p-8">
                    <h2 className="font-display text-lg uppercase tracking-wide text-white light:text-ink-900">
                        {chart.label} size guide
                    </h2>
                    <p className="mt-2 text-xs text-white/50 light:text-ink-900/60">
                        {chart.note} General reference in centimetres — actual
                        measurements can vary slightly by batch.
                    </p>

                    <div className="mt-6 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.15em] text-white/40 light:border-ink-900/10 light:text-ink-900/50">
                                    <th className="py-2 pr-4 font-normal">Size</th>
                                    <th className="py-2 pr-4 font-normal">Chest</th>
                                    <th className="py-2 pr-4 font-normal">Length</th>
                                    <th className="py-2 font-normal">Sleeve</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 light:divide-ink-900/5">
                                {chart.rows.map((row) => (
                                    <tr key={row.size} className="text-white light:text-ink-900">
                                        <td className="py-2 pr-4 font-display uppercase tracking-wide">
                                            {row.size}
                                        </td>
                                        <td className="py-2 pr-4 text-white/70 light:text-ink-900/75">
                                            {row.chest} cm
                                        </td>
                                        <td className="py-2 pr-4 text-white/70 light:text-ink-900/75">
                                            {row.length} cm
                                        </td>
                                        <td className="py-2 text-white/70 light:text-ink-900/75">
                                            {row.sleeve} cm
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="mt-8 w-full border-2 border-white/15 py-3 font-display text-xs uppercase tracking-[0.2em] text-white transition-colors hover:border-volt-500 hover:text-volt-500 light:border-ink-900/20 light:text-ink-900 light:hover:border-volt-800 light:hover:text-volt-800"
                    >
                        Close
                    </button>
                </div>
            </Modal>
        </>
    );
}
