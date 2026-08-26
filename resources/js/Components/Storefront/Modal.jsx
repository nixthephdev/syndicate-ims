import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

/**
 * Theme-aware modal for the storefront. Not @/Components/Modal — that one is
 * a white `Dialog.Panel` and would be the one obviously-Breeze element left
 * on an otherwise storefront-themed page. Same headlessui primitives.
 */
export default function Modal({ children, show = false, onClose = () => {} }) {
    return (
        <Transition show={show} as={Fragment} leave="duration-150">
            <Dialog
                as="div"
                className="fixed inset-0 z-50 flex transform items-center overflow-y-auto px-4 py-6 transition-all sm:px-0"
                onClose={onClose}
            >
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    {/* Backdrop stays dark-tinted in both themes — a
                        semi-transparent black scrim behind a modal is the
                        conventional treatment even on light-mode sites. */}
                    <div className="absolute inset-0 bg-ink-950/80" />
                </Transition.Child>

                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                    enterTo="opacity-100 translate-y-0 sm:scale-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                    leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                >
                    <Dialog.Panel className="mb-6 w-full transform overflow-hidden border-2 border-white/10 bg-ink-900 text-white shadow-2xl transition-all light:border-ink-900/10 light:bg-paper-panel light:text-ink-900 sm:mx-auto sm:max-w-lg">
                        {children}
                    </Dialog.Panel>
                </Transition.Child>
            </Dialog>
        </Transition>
    );
}
