import { useEffect } from 'react';
import StorefrontAuthLayout from '@/Layouts/StorefrontAuthLayout';
import { Field, SubmitButton } from '@/Components/Storefront/FormControls';
import { Head, useForm } from '@inertiajs/react';

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        return () => {
            reset('password', 'password_confirmation');
        };
    }, []);

    const onHandleChange = (event) => {
        setData(event.target.name, event.target.value);
    };

    const submit = (e) => {
        e.preventDefault();

        post(route('password.store'));
    };

    return (
        <StorefrontAuthLayout
            eyebrow="Password reset"
            title={
                <>
                    Set a new
                    <br />
                    password.
                </>
            }
            intro="Pick something you'll actually remember. At least 8 characters."
        >
            <Head title="Reset password" />

            <form onSubmit={submit} className="space-y-6">
                {/* Email arrives prefilled from the reset link and is part of
                    what the token is validated against — editable, because
                    Breeze validates it server-side and a mismatch must fail
                    loudly rather than be silently corrected. */}
                <Field
                    id="email"
                    name="email"
                    type="email"
                    label="Email"
                    value={data.email}
                    autoComplete="username"
                    required
                    error={errors.email}
                    onChange={onHandleChange}
                />

                <Field
                    id="password"
                    name="password"
                    type="password"
                    label="New password"
                    placeholder="At least 8 characters"
                    value={data.password}
                    autoComplete="new-password"
                    autoFocus
                    required
                    error={errors.password}
                    onChange={onHandleChange}
                />

                {/* Breeze shipped this field with no id, so its label was bound
                    to nothing. Field always pairs htmlFor with id. */}
                <Field
                    id="password_confirmation"
                    name="password_confirmation"
                    type="password"
                    label="Confirm new password"
                    placeholder="••••••••"
                    value={data.password_confirmation}
                    autoComplete="new-password"
                    required
                    error={errors.password_confirmation}
                    onChange={onHandleChange}
                />

                <SubmitButton processing={processing}>
                    {processing ? 'Resetting' : 'Reset password'}
                </SubmitButton>
            </form>
        </StorefrontAuthLayout>
    );
}
