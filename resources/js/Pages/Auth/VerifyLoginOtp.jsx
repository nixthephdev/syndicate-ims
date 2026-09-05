import StorefrontAuthLayout from '@/Layouts/StorefrontAuthLayout';
import OtpForm from '@/Components/Storefront/OtpForm';
import { Head } from '@inertiajs/react';

export default function VerifyLoginOtp() {
    return (
        <StorefrontAuthLayout
            eyebrow="Verify"
            title={
                <>
                    Check
                    <br />
                    your email.
                </>
            }
            intro="We sent a 6-digit code to your email address. Enter it below to finish signing in."
        >
            <Head title="Verify sign-in" />

            <OtpForm
                submitRouteName="login.otp.store"
                resendRouteName="login.otp.resend"
                submitLabel="Verify and sign in"
            />
        </StorefrontAuthLayout>
    );
}
