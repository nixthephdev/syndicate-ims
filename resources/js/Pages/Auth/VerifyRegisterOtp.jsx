import StorefrontAuthLayout from '@/Layouts/StorefrontAuthLayout';
import OtpForm from '@/Components/Storefront/OtpForm';
import { Head } from '@inertiajs/react';

export default function VerifyRegisterOtp({ email }) {
    return (
        <StorefrontAuthLayout
            eyebrow="Verify"
            title={
                <>
                    Confirm
                    <br />
                    your email.
                </>
            }
            intro={
                email
                    ? `We sent a 6-digit code to ${email}. Enter it below to finish creating your account.`
                    : 'We sent a 6-digit code to your email address. Enter it below to finish creating your account.'
            }
        >
            <Head title="Verify your email" />

            <OtpForm
                submitRouteName="register.otp.store"
                resendRouteName="register.otp.resend"
                submitLabel="Verify and create account"
            />
        </StorefrontAuthLayout>
    );
}
