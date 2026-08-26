import StorefrontLayout from '@/Layouts/StorefrontLayout';
import { Head, Link } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({ mustVerifyEmail, status }) {
    return (
        <StorefrontLayout>
            <Head title="Account settings" />

            <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
                <Link
                    href={route('dashboard')}
                    className="font-display text-xs uppercase tracking-[0.25em] text-white/30 transition-colors hover:text-volt-500 light:text-ink-900/45 light:hover:text-volt-800"
                >
                    ← Your account
                </Link>

                <h1 className="mt-6 font-display text-[clamp(2rem,7vw,4rem)] uppercase leading-[0.9] tracking-tighter text-white light:text-ink-900">
                    Settings
                </h1>

                <div className="mt-12 space-y-10">
                    <section className="border-2 border-white/10 p-6 sm:p-8 light:border-ink-900/10">
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                        />
                    </section>

                    <section className="border-2 border-white/10 p-6 sm:p-8 light:border-ink-900/10">
                        <UpdatePasswordForm />
                    </section>

                    <section className="border-2 border-red-500/20 p-6 sm:p-8 light:border-red-700/25">
                        <DeleteUserForm />
                    </section>
                </div>
            </div>
        </StorefrontLayout>
    );
}
