import StorefrontLayout from '@/Layouts/StorefrontLayout';
import OtpForm from '@/Components/Storefront/OtpForm';
import { Head } from '@inertiajs/react';

export default function CheckoutOtp() {
    return (
        <StorefrontLayout>
            <Head title="Confirm your order" />

            <div className="mx-auto max-w-md px-4 py-12 sm:px-6 lg:py-16">
                <h1 className="font-display text-[clamp(1.75rem,6vw,3rem)] uppercase leading-[0.9] tracking-tighter text-white light:text-ink-900">
                    Confirm your order
                </h1>
                <p className="mt-4 text-sm leading-relaxed text-white/50 light:text-ink-900/65">
                    We sent a 6-digit code to your email address. Enter it below
                    to place your order — nothing is charged or taken off the
                    shelf yet, this just confirms it's really you.
                </p>

                <div className="mt-8">
                    <OtpForm
                        submitRouteName="checkout.otp.store"
                        resendRouteName="checkout.otp.resend"
                        submitLabel="Confirm order"
                    />
                </div>
            </div>
        </StorefrontLayout>
    );
}
