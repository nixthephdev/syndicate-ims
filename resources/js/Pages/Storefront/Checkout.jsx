import { Head, Link, useForm } from '@inertiajs/react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import { Field, SubmitButton } from '@/Components/Storefront/FormControls';
import { formatCentavos } from '@/utils/money';

/** Two-way toggle — pickup/delivery here, gcash/cash further down. Only used
 * in this one form, so it stays inline rather than becoming a third shared
 * button variant. */
function ToggleOption({ selected, onClick, title, description }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={
                'flex-1 border-2 px-4 py-3 text-left transition-colors ' +
                (selected
                    ? 'border-volt-500 bg-volt-500/10 light:border-volt-800 light:bg-volt-800/10'
                    : 'border-white/15 hover:border-white/30 light:border-ink-900/20 light:hover:border-ink-900/35')
            }
        >
            <span className="block font-display text-xs uppercase tracking-[0.2em] text-white light:text-ink-900">
                {title}
            </span>
            <span className="mt-1 block text-xs text-white/40 light:text-ink-900/55">
                {description}
            </span>
        </button>
    );
}

export default function Checkout({ lines, subtotal_centavos, defaults }) {
    const { data, setData, post, processing, errors } = useForm({
        customer_name: defaults.customer_name ?? '',
        customer_email: defaults.customer_email ?? '',
        customer_phone: '',
        fulfillment_method: 'pickup',
        payment_method: 'gcash',
        address_line: '',
        barangay: '',
        city: '',
        province: '',
        postal_code: '',
        notes: '',
    });

    const onChange = (e) => setData(e.target.name, e.target.value);
    const isDelivery = data.fulfillment_method === 'delivery';
    // Mirrors CheckoutController::otpStore()'s (int) ceil($subtotal / 2) —
    // display only, the server always recomputes this itself.
    const depositPreview = Math.ceil(subtotal_centavos / 2);

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

                        {/* Fulfillment — decides both whether an address is
                            needed and how payment works below (see
                            CheckoutController::otpStore()). */}
                        <div className="border-t border-white/10 pt-6 light:border-ink-900/10">
                            <h2 className="font-display text-xs uppercase tracking-[0.25em] text-white/50 light:text-ink-900/65">
                                How will you get this?
                            </h2>
                            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                                <ToggleOption
                                    selected={!isDelivery}
                                    onClick={() => setData('fulfillment_method', 'pickup')}
                                    title="Pickup"
                                    description="Collect it at one of our branches."
                                />
                                <ToggleOption
                                    selected={isDelivery}
                                    onClick={() =>
                                        // Cash is pickup-only, so switching to
                                        // delivery has to drop it — leaving it
                                        // selected would submit a combination
                                        // the server rejects, and the option
                                        // isn't even rendered below any more.
                                        setData((current) => ({
                                            ...current,
                                            fulfillment_method: 'delivery',
                                            payment_method:
                                                current.payment_method === 'cash'
                                                    ? 'gcash'
                                                    : current.payment_method,
                                        }))
                                    }
                                    title="Delivery"
                                    description="50% deposit now, rest in cash on delivery."
                                />
                            </div>
                        </div>

                        {isDelivery ? (
                            /* Philippine delivery address — every branch and
                               every customer this shop has ever had is in
                               the Philippines, so the form is shaped for
                               that (barangay included) rather than a
                               generic international one. Required once
                               delivery is chosen — see CheckoutRequest. */
                            <div className="border-t border-white/10 pt-6 light:border-ink-900/10">
                                <h2 className="font-display text-xs uppercase tracking-[0.25em] text-white/50 light:text-ink-900/65">
                                    Delivery address
                                </h2>
                                <p className="mt-2 text-xs text-white/40 light:text-ink-900/55">
                                    A 50% deposit of{' '}
                                    <span className="text-volt-500 light:text-volt-800">
                                        {formatCentavos(depositPreview)}
                                    </span>{' '}
                                    is paid now via GCash to secure your order — the
                                    remaining {formatCentavos(subtotal_centavos - depositPreview)} is
                                    paid in cash when it's delivered.
                                </p>

                                <div className="mt-4 space-y-4">
                                    <Field
                                        id="address_line"
                                        name="address_line"
                                        label="House / unit / street"
                                        placeholder="123 Rizal St."
                                        value={data.address_line}
                                        autoComplete="address-line1"
                                        required
                                        error={errors.address_line}
                                        onChange={onChange}
                                    />

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Field
                                            id="barangay"
                                            name="barangay"
                                            label="Barangay"
                                            value={data.barangay}
                                            required
                                            error={errors.barangay}
                                            onChange={onChange}
                                        />
                                        <Field
                                            id="city"
                                            name="city"
                                            label="City / municipality"
                                            value={data.city}
                                            autoComplete="address-level2"
                                            required
                                            error={errors.city}
                                            onChange={onChange}
                                        />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Field
                                            id="province"
                                            name="province"
                                            label="Province"
                                            value={data.province}
                                            autoComplete="address-level1"
                                            required
                                            error={errors.province}
                                            onChange={onChange}
                                        />
                                        <Field
                                            id="postal_code"
                                            name="postal_code"
                                            label="ZIP code"
                                            value={data.postal_code}
                                            autoComplete="postal-code"
                                            error={errors.postal_code}
                                            onChange={onChange}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {/* Payment method. Shown for BOTH fulfillment options —
                            a delivery order still has to choose HOW it sends
                            its 50% deposit. Cash is the one that isn't
                            universal: it means "hand it over at the branch",
                            which a delivery order cannot do, so it disappears
                            rather than being offered and then rejected.
                            CheckoutRequest enforces the same rule server-side. */}
                        <div className="border-t border-white/10 pt-6 light:border-ink-900/10">
                            <h2 className="font-display text-xs uppercase tracking-[0.25em] text-white/50 light:text-ink-900/65">
                                {isDelivery ? 'How will you send the deposit?' : 'Payment'}
                            </h2>

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                                <ToggleOption
                                    selected={data.payment_method === 'gcash'}
                                    onClick={() => setData('payment_method', 'gcash')}
                                    title="GCash"
                                    description="Send it, then upload your receipt."
                                />
                                <ToggleOption
                                    selected={data.payment_method === 'bank_transfer'}
                                    onClick={() => setData('payment_method', 'bank_transfer')}
                                    title="Bank transfer"
                                    description="Send it, then upload your receipt."
                                />
                                {!isDelivery && (
                                    <ToggleOption
                                        selected={data.payment_method === 'cash'}
                                        onClick={() => setData('payment_method', 'cash')}
                                        title="Cash at pickup"
                                        description="Pay when you collect it."
                                    />
                                )}
                            </div>

                            {data.payment_method !== 'cash' && (
                                <p className="mt-3 text-xs leading-relaxed text-white/40 light:text-ink-900/55">
                                    We'll show you where to send{' '}
                                    {formatCentavos(isDelivery ? depositPreview : subtotal_centavos)}{' '}
                                    on the next screen. Your order is confirmed once we've
                                    checked the payment arrived.
                                </p>
                            )}

                            {errors.payment_method && (
                                <p className="mt-2 text-sm text-red-400">{errors.payment_method}</p>
                            )}
                        </div>

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
                                placeholder="Anything the shop should know."
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
                            stock — stock is only deducted once payment (or
                            the deposit, for delivery) actually goes through.
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
