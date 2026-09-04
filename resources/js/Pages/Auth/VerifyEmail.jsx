import StorefrontAuthLayout from '@/Layouts/StorefrontAuthLayout';
import { SubmitButton } from '@/Components/Storefront/FormControls';
import { Head, Link, useForm } from '@inertiajs/react';

export default function VerifyEmail() {
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
                    className="font-display uppercase tracking-[0.15em] text-white/40 hover:text-white light:text-ink-900/55 light:hover:text-ink-900"
                >
                    Log out
                </Link>
            }
        >
            <Head title="Verify email" />

            {/* Shown as a toast now — StorefrontAuthLayout's ToastStack
                translates the `verification-link-sent` status flag into a
                real message (see useFlashToasts.js's STATUS_MESSAGES). */}

            <form onSubmit={submit}>
                <SubmitButton processing={processing}>
                    {processing ? 'Sending' : 'Resend verification email'}
                </SubmitButton>
            </form>
        </StorefrontAuthLayout>
    );
}
