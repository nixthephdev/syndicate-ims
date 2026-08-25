import { useEffect } from 'react';
import StorefrontAuthLayout from '@/Layouts/StorefrontAuthLayout';
import { Field, SubmitButton, CheckboxRow } from '@/Components/Storefront/FormControls';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: '',
    });

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    const handleOnChange = (event) => {
        setData(event.target.name, event.target.type === 'checkbox' ? event.target.checked : event.target.value);
    };

    const submit = (e) => {
        e.preventDefault();

        post(route('login'));
    };

    return (
        <StorefrontAuthLayout
            eyebrow="Members"
            title={
                <>
                    Welcome
                    <br />
                    back.
                </>
            }
            intro="Log in to pick up your cart, your builds and your order history."
            footer={
                <>
                    No account yet?{' '}
                    <Link
                        href={route('register')}
                        className="font-display uppercase tracking-[0.15em] text-volt-500 hover:text-white"
                    >
                        Sign up
                    </Link>
                </>
            }
        >
            <Head title="Log in" />

            {/* Post-reset / post-verification notices land here. */}
            {status && (
                <div className="mb-6 border-l-2 border-volt-500 bg-volt-500/10 px-4 py-3 text-sm text-volt-300">
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
                    error={errors.email}
                    onChange={handleOnChange}
                />

                <Field
                    id="password"
                    name="password"
                    type="password"
                    label="Password"
                    placeholder="••••••••"
                    value={data.password}
                    autoComplete="current-password"
                    error={errors.password}
                    onChange={handleOnChange}
                />

                <div className="flex items-center justify-between gap-4">
                    <CheckboxRow
                        id="remember"
                        name="remember"
                        label="Remember me"
                        checked={data.remember}
                        onChange={handleOnChange}
                    />

                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="text-sm text-white/40 underline underline-offset-4 transition-colors hover:text-volt-500"
                        >
                            Forgot password?
                        </Link>
                    )}
                </div>

                <SubmitButton processing={processing}>
                    {processing ? 'Logging in' : 'Log in'}
                </SubmitButton>
            </form>
        </StorefrontAuthLayout>
    );
}
