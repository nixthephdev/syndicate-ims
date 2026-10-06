import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { useAdminTheme } from '@/utils/useAdminTheme';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import { ExclamationTriangleIcon } from './icons';

/**
 * "Are you sure?" for admin actions, replacing the browser's native
 * confirm() box. Usage:
 *
 *   const [confirmDialog, ask] = useConfirm();
 *   ask({ title, message, confirmLabel, danger }, () => router.patch(...));
 *   ...render {confirmDialog} anywhere in the page.
 *
 * headlessui portals the Dialog to <body>, OUTSIDE AdminLayout's wrapper div
 * that carries data-admin-theme — so admin-light: classes would never match
 * in here. The attribute is set again on the dialog's own root for that
 * reason; admin-light: is a descendant selector, so the panel inside picks
 * it up.
 */
export function useConfirm() {
    const [request, setRequest] = useState(null);
    const { theme } = useAdminTheme();
    const close = () => setRequest(null);

    const dialog = (
        <Dialog open={request !== null} onClose={close} className="relative z-50" data-admin-theme={theme}>
            <div className="fixed inset-0 bg-ink-950/70" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="w-full max-w-md rounded-md border border-white/10 bg-ink-900 p-6 shadow-2xl admin-light:border-ink-900/10 admin-light:bg-white">
                    <div className="flex gap-4">
                        <span
                            className={
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-md ' +
                                (request?.danger ? 'bg-red-500/10 text-red-400' : 'bg-volt-500/10 text-volt-500 admin-light:text-volt-800')
                            }
                        >
                            <ExclamationTriangleIcon className="h-5 w-5" />
                        </span>
                        <div>
                            <Dialog.Title className="font-oswald text-lg font-semibold uppercase tracking-wide text-white admin-light:text-ink-900">
                                {request?.title}
                            </Dialog.Title>
                            {request?.message && (
                                <Dialog.Description className="mt-2 text-sm text-white/60 admin-light:text-ink-900/70">
                                    {request.message}
                                </Dialog.Description>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={close}>Go back</SecondaryButton>
                        {request?.danger ? (
                            <button
                                type="button"
                                onClick={() => {
                                    request.onConfirm();
                                    close();
                                }}
                                className="font-oswald inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-red-500"
                            >
                                {request.confirmLabel ?? 'Confirm'}
                            </button>
                        ) : (
                            <PrimaryButton
                                onClick={() => {
                                    request.onConfirm();
                                    close();
                                }}
                            >
                                {request?.confirmLabel ?? 'Confirm'}
                            </PrimaryButton>
                        )}
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );

    return [dialog, (options, onConfirm) => setRequest({ ...options, onConfirm })];
}
