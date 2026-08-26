import { Field, SubmitButton } from '@/Components/Storefront/FormControls';
import { Link, useForm, usePage } from '@inertiajs/react';
import { Transition } from '@headlessui/react';

export default function UpdateProfileInformation({ mustVerifyEmail, status }) {
    const user = usePage().props.auth.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: user.name,
        email: user.email,
    });

    const onChange = (e) => setData(e.target.name, e.target.value);

    const submit = (e) => {
        e.preventDefault();
        patch(route('profile.update'));
    };

    return (
        <section>
            <header>
                <h2 className="font-display text-lg uppercase tracking-wide text-white light:text-ink-900">
                    Profile information
                </h2>
                <p className="mt-1 text-sm text-white/40 light:text-ink-900/55">
                    Update your name and email address.
                </p>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-6">
                <Field
                    id="name"
                    name="name"
                    label="Name"
                    value={data.name}
                    autoComplete="name"
                    autoFocus
                    required
                    error={errors.name}
                    onChange={onChange}
                />

                <Field
                    id="email"
                    name="email"
                    type="email"
                    label="Email"
                    value={data.email}
                    autoComplete="username"
                    required
                    error={errors.email}
                    onChange={onChange}
                />

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div className="border-l-2 border-amber-400 bg-amber-400/10 px-4 py-3 text-sm text-amber-200 light:text-amber-800">
                        Your email address is unverified.{' '}
                        <Link
                            href={route('verification.send')}
                            method="post"
                            as="button"
                            className="underline underline-offset-4 hover:text-white light:hover:text-ink-900"
                        >
                            Click here to re-send the verification email.
                        </Link>
                        {status === 'verification-link-sent' && (
                            <p className="mt-2 font-medium text-volt-400 light:text-volt-800">
                                A new verification link has been sent to your
                                email address.
                            </p>
                        )}
                    </div>
                )}

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
