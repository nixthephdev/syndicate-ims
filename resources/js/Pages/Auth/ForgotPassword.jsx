import StorefrontAuthLayout from '@/Layouts/StorefrontAuthLayout';
import { Field, SubmitButton } from '@/Components/Storefront/FormControls';
import { Head, Link, useForm } from '@inertiajs/react';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const onHandleChange = (event) => {
        setData(event.target.name, event.target.value);
    };

    const submit = (e) => {
        e.preventDefault();

        post(route('password.email'));
    };

    return (
        <StorefrontAuthLayout
            eyebrow="Password reset"
            title={
                <>
                    Locked
                    <br />
                    out?
                </>
            }
            intro="Give us the email on your account and we'll send a link to set a new password."
            footer={
                <>
                    Remembered it?{' '}
                    <Link
                        href={route('login')}
                        className="font-display uppercase tracking-[0.15em] text-volt-500 hover:text-white light:text-volt-800 light:hover:text-ink-900"
                    >
                        Log in
                    </Link>
                </>
            }
        >
            <Head title="Forgot password" />

            {/* Laravel returns the same confirmation whether or not the email
                is on file — deliberately, so the form can't be used to probe
                which addresses have accounts. Wording stays vague to match. */}
            {status && (
                <div
                    role="status"
                    className="mb-6 border-l-2 border-volt-500 bg-volt-500/10 px-4 py-3 text-sm text-volt-300 light:text-volt-800"
                >
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-6">
                <Field
                    id="email"
                    name="email"
                    type="email"
                    label="Email"
                    placeholder="you@example.com"
                    value={data.email}
                    autoComplete="username"
                    autoFocus
                    required
                    error={errors.email}
                    onChange={onHandleChange}
                />

                <SubmitButton processing={processing}>
                    {processing ? 'Sending' : 'Send reset link'}
                </SubmitButton>
            </form>
        </StorefrontAuthLayout>
    );
}
