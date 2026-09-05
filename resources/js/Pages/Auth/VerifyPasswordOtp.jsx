import StorefrontAuthLayout from '@/Layouts/StorefrontAuthLayout';
import OtpForm from '@/Components/Storefront/OtpForm';
import { Head } from '@inertiajs/react';

export default function VerifyPasswordOtp({ email }) {
    return (
        <StorefrontAuthLayout
            eyebrow="Password reset"
            title={
                <>
                    Check
                    <br />
                    your email.
                </>
            }
            intro={
                // Worded so it reads the same whether or not that address
                // actually has an account — see PasswordResetLinkController.
                email
                    ? `If ${email} has an account with us, a 6-digit code is on its way. Enter it below.`
                    : 'If that address has an account with us, a 6-digit code is on its way. Enter it below.'
            }
        >
            <Head title="Verify password reset" />

            <OtpForm
                submitRouteName="password.otp.store"
                resendRouteName="password.otp.resend"
                submitLabel="Verify code"
            />
        </StorefrontAuthLayout>
    );
}
