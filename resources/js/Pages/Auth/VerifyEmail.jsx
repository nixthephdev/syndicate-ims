import StorefrontAuthLayout from '@/Layouts/StorefrontAuthLayout';
import { SubmitButton } from '@/Components/Storefront/FormControls';
import { Head, Link, useForm } from '@inertiajs/react';

export default function VerifyEmail({ status }) {
    const { post, processing } = useForm({});

    const submit = (e) => {
        e.preventDefault();
        post(route('verification.send'));
    };

    return (
        <StorefrontAuthLayout
            eyebrow="One more step"
            title={
                <>
                    Check your
                    <br />
                    inbox.
                </>
            }
            intro="Thanks for signing up. Verify your email address by clicking the link we just sent you."
            footer={
                <Link
                    href={route('logout')}
                    method="post"
                    as="button"
                    className="font-display uppercase tracking-[0.15em] text-white/40 hover:text-white"
                >
                    Log out
                </Link>
            }
        >
            <Head title="Verify email" />

            {status === 'verification-link-sent' && (
                <div className="mb-6 border-l-2 border-volt-500 bg-volt-500/10 px-4 py-3 text-sm text-volt-300">
                    A new verification link has been sent to the email address
                    you provided during registration.
                </div>
            )}

            <form onSubmit={submit}>
                <SubmitButton processing={processing}>
                    {processing ? 'Sending' : 'Resend verification email'}
                </SubmitButton>
            </form>
        </StorefrontAuthLayout>
    );
}
