import { useEffect } from 'react';
import StorefrontAuthLayout from '@/Layouts/StorefrontAuthLayout';
import { Field, SubmitButton } from '@/Components/Storefront/FormControls';
import { Head, useForm } from '@inertiajs/react';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    const submit = (e) => {
        e.preventDefault();
        post(route('password.confirm'));
    };

    return (
        <StorefrontAuthLayout
            eyebrow="Secure area"
            title={
                <>
                    Confirm it's
                    <br />
                    you.
                </>
            }
            intro="This is a secure area — confirm your password before continuing."
        >
            <Head title="Confirm password" />

            <form onSubmit={submit} className="space-y-6">
                <Field
                    id="password"
                    name="password"
                    type="password"
                    label="Password"
                    value={data.password}
                    autoComplete="current-password"
                    autoFocus
                    error={errors.password}
                    onChange={(e) => setData('password', e.target.value)}
                />

                <SubmitButton processing={processing}>
                    {processing ? 'Confirming' : 'Confirm'}
                </SubmitButton>
            </form>
        </StorefrontAuthLayout>
    );
}
