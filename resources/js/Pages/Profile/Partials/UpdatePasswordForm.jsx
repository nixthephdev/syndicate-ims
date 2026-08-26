import { useRef } from 'react';
import { Field, SubmitButton } from '@/Components/Storefront/FormControls';
import { useForm } from '@inertiajs/react';
import { Transition } from '@headlessui/react';

export default function UpdatePasswordForm() {
    const passwordInput = useRef();
    const currentPasswordInput = useRef();

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const onChange = (e) => setData(e.target.name, e.target.value);

    const updatePassword = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: () => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <section>
            <header>
                <h2 className="font-display text-lg uppercase tracking-wide text-white light:text-ink-900">
                    Update password
                </h2>
                <p className="mt-1 text-sm text-white/40 light:text-ink-900/55">
                    Use a long, random password to keep your account secure.
                </p>
            </header>

            <form onSubmit={updatePassword} className="mt-6 space-y-6">
                <Field
                    id="current_password"
                    name="current_password"
                    type="password"
                    label="Current password"
                    ref={currentPasswordInput}
                    value={data.current_password}
                    autoComplete="current-password"
                    error={errors.current_password}
                    onChange={onChange}
                />

                <Field
                    id="password"
                    name="password"
                    type="password"
                    label="New password"
                    ref={passwordInput}
                    value={data.password}
                    autoComplete="new-password"
                    error={errors.password}
                    onChange={onChange}
                />

                <Field
                    id="password_confirmation"
                    name="password_confirmation"
                    type="password"
                    label="Confirm new password"
                    value={data.password_confirmation}
                    autoComplete="new-password"
                    error={errors.password_confirmation}
                    onChange={onChange}
                />

                <div className="flex items-center gap-4">
                    <SubmitButton processing={processing} fullWidth={false}>
                        Save
                    </SubmitButton>

                    <Transition
                        show={recentlySuccessful}
                        enterFrom="opacity-0"
                        leaveTo="opacity-0"
                        className="transition ease-in-out"
                    >
                        <p className="text-sm text-white/40 light:text-ink-900/55">Saved.</p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
