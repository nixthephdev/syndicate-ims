import { useEffect } from 'react';
import StorefrontAuthLayout from '@/Layouts/StorefrontAuthLayout';
import { Field, SubmitButton } from '@/Components/Storefront/FormControls';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        return () => {
            reset('password', 'password_confirmation');
        };
    }, []);

    const handleOnChange = (event) => {
        setData(event.target.name, event.target.type === 'checkbox' ? event.target.checked : event.target.value);
    };

    const submit = (e) => {
        e.preventDefault();

        post(route('register'));
    };

    return (
        <StorefrontAuthLayout
            eyebrow="Join the crew"
            title={
                <>
                    Make it
                    <br />
                    yours.
                </>
            }
            intro="One account for your cart, your custom builds and every order you place."
            footer={
                <>
                    Already registered?{' '}
                    <Link
                        href={route('login')}
                        className="font-display uppercase tracking-[0.15em] text-volt-500 hover:text-white light:text-volt-800 light:hover:text-ink-900"
                    >
                        Log in
                    </Link>
                </>
            }
        >
            <Head title="Sign up" />

            <form onSubmit={submit} className="space-y-6">
                <Field
                    id="name"
                    name="name"
                    label="Name"
                    placeholder="Juan Dela Cruz"
                    value={data.name}
                    autoComplete="name"
                    autoFocus
                    required
                    error={errors.name}
                    onChange={handleOnChange}
                />

                <Field
                    id="email"
                    name="email"
                    type="email"
                    label="Email"
                    placeholder="you@example.com"
                    value={data.email}
                    autoComplete="username"
                    required
                    error={errors.email}
                    onChange={handleOnChange}
                />

                <Field
                    id="password"
                    name="password"
                    type="password"
                    label="Password"
                    placeholder="At least 8 characters"
                    value={data.password}
                    autoComplete="new-password"
                    required
                    error={errors.password}
                    onChange={handleOnChange}
                />

                <Field
                    id="password_confirmation"
                    name="password_confirmation"
                    type="password"
                    label="Confirm password"
                    placeholder="••••••••"
                    value={data.password_confirmation}
                    autoComplete="new-password"
                    required
                    error={errors.password_confirmation}
                    onChange={handleOnChange}
                />

                <SubmitButton processing={processing}>
                    {processing ? 'Creating account' : 'Create account'}
                </SubmitButton>
            </form>
        </StorefrontAuthLayout>
    );
}
