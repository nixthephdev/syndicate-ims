import { Head, Link, useForm } from '@inertiajs/react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import { Field, SubmitButton } from '@/Components/Storefront/FormControls';
import { formatCentavos } from '@/utils/money';

export default function Checkout({ lines, subtotal_centavos, defaults }) {
    const { data, setData, post, processing, errors } = useForm({
        customer_name: defaults.customer_name ?? '',
        customer_email: defaults.customer_email ?? '',
        customer_phone: '',
        notes: '',
    });

    const onChange = (e) => setData(e.target.name, e.target.value);

    const submit = (e) => {
        e.preventDefault();
        post(route('checkout.store'));
    };

    return (
        <StorefrontLayout>
            <Head title="Checkout" />

            <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
                <Link
                    href={route('cart.index')}
                    className="font-display text-xs uppercase tracking-[0.25em] text-white/30 transition-colors hover:text-volt-500 light:text-ink-900/45 light:hover:text-volt-800"
                >
                    ← Cart
                </Link>

                <h1 className="mt-6 font-display text-[clamp(2rem,7vw,4rem)] uppercase leading-[0.9] tracking-tighter text-white light:text-ink-900">
                    Checkout
                </h1>

                <div className="mt-12 grid gap-12 lg:grid-cols-5 lg:gap-16">
                    {/* Details */}
                    <form onSubmit={submit} className="space-y-6 lg:col-span-3">
                        <Field
                            id="customer_name"
                            name="customer_name"
                            label="Full name"
                            value={data.customer_name}
                            autoComplete="name"
                            required
                            error={errors.customer_name}
                            onChange={onChange}
                        />

                        <Field
                            id="customer_email"
                            name="customer_email"
                            type="email"
                            label="Email"
                            value={data.customer_email}
                            autoComplete="email"
                            required
                            error={errors.customer_email}
                            onChange={onChange}
                        />

                        <Field
                            id="customer_phone"
                            name="customer_phone"
                            label="Mobile number"
                            placeholder="0917 123 4567"
                            value={data.customer_phone}
                            autoComplete="tel"
                            required
                            error={errors.customer_phone}
                            onChange={onChange}
                        />

                        <div>
                            <label
                                htmlFor="notes"
                                className="mb-2 block font-display text-xs uppercase tracking-[0.25em] text-white/50 light:text-ink-900/65"
                            >
                                Notes <span className="text-white/25 light:text-ink-900/40">(optional)</span>
                            </label>
                            <textarea
                                id="notes"
                                name="notes"
                                rows={3}
                                value={data.notes}
                                onChange={onChange}
                                placeholder="Pickup or delivery? Anything the shop should know."
                                className="block w-full rounded-none border-2 border-white/15 bg-ink-800 px-4 py-3 text-white placeholder-white/25 transition-colors focus:border-volt-500 focus:outline-none focus:ring-0 light:border-ink-900/20 light:bg-white light:text-ink-900 light:placeholder-ink-900/35 light:focus:border-volt-800"
                            />
                            {errors.notes && (
                                <p className="mt-2 text-sm font-medium text-red-400 light:text-red-700">
                                    {errors.notes}
                                </p>
                            )}
                        </div>

                        <SubmitButton processing={processing}>
                            {processing ? 'Placing order' : 'Place order'}
                        </SubmitButton>

                        <p className="text-xs leading-relaxed text-white/30 light:text-ink-900/45">
                            Placing the order does not take payment or reserve
                            stock. You'll confirm payment on the next screen,
                            and stock is only deducted then.
                        </p>
                    </form>

                    {/* Summary */}
                    <aside className="lg:col-span-2">
                        <div className="border-2 border-white/10 p-6 light:border-ink-900/10">
                            <h2 className="font-display text-sm uppercase tracking-[0.25em] text-volt-500 light:text-volt-800">
                                Your order
                            </h2>

                            <ul className="mt-6 space-y-4">
                                {lines.map((line) => (
                                    <li
                                        key={line.key}
                                        className="flex justify-between gap-4 text-sm"
                                    >
                                        <span className="text-white/70 light:text-ink-900/80">
                                            {line.name}
                                            <span className="text-white/30 light:text-ink-900/45">
                                                {' '}
                                                × {line.quantity}
                                            </span>
                                        </span>
                                        <span className="shrink-0 text-white light:text-ink-900">
                                            {formatCentavos(line.line_total_centavos)}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-6 flex items-baseline justify-between border-t border-white/10 pt-6 light:border-ink-900/10">
                                <span className="font-display text-sm uppercase tracking-[0.2em] text-white/50 light:text-ink-900/65">
                                    Total
                                </span>
                                <span className="font-display text-2xl text-volt-500 light:text-volt-800">
                                    {formatCentavos(subtotal_centavos)}
                                </span>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </StorefrontLayout>
    );
}
