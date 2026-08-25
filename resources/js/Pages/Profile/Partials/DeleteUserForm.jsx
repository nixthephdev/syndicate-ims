import { useRef, useState } from 'react';
import { Field, DangerButton, GhostButton } from '@/Components/Storefront/FormControls';
import Modal from '@/Components/Storefront/Modal';
import { useForm } from '@inertiajs/react';

export default function DeleteUserForm() {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef();

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
    } = useForm({
        password: '',
    });

    const deleteUser = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current?.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);
        reset();
    };

    return (
        <section>
            <header>
                <h2 className="font-display text-lg uppercase tracking-wide text-red-400">
                    Delete account
                </h2>
                <p className="mt-1 text-sm text-white/40">
                    Once deleted, all of your account's data is gone for good.
                    Download anything you want to keep before continuing.
                </p>
            </header>

            <DangerButton className="mt-6" onClick={() => setConfirmingUserDeletion(true)}>
                Delete account
            </DangerButton>

            <Modal show={confirmingUserDeletion} onClose={closeModal}>
                <form onSubmit={deleteUser} className="p-6 sm:p-8">
                    <h2 className="font-display text-xl uppercase tracking-wide text-white">
                        Are you sure?
                    </h2>

                    <p className="mt-2 text-sm leading-relaxed text-white/50">
                        This can't be undone. Enter your password to confirm you
                        want to permanently delete your account.
                    </p>

                    <div className="mt-6">
                        <Field
                            id="delete_password"
                            name="password"
                            type="password"
                            label="Password"
                            ref={passwordInput}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            error={errors.password}
                            autoFocus
                            placeholder="Password"
                        />
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        <GhostButton type="button" onClick={closeModal}>
                            Cancel
                        </GhostButton>
                        <DangerButton disabled={processing}>
                            Delete account
                        </DangerButton>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
