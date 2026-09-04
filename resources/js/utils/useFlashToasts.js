import { router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

let nextId = 0;

/**
 * Breeze's `status` prop is USUALLY the display text itself (password-reset
 * / forgot-password confirmations), but VerifyEmail.jsx is the one place
 * it's a flag code, not a message — translate the ones we know about rather
 * than showing "verification-link-sent" verbatim in a toast.
 */
const STATUS_MESSAGES = {
    'verification-link-sent':
        'A new verification link has been sent to the email address you provided.',
};

/**
 * `errors` carries two genuinely different kinds of message under one
 * Laravel/Inertia mechanism: real FormRequest field validation (`email`,
 * `password`, `sku`, `price`...), which every form on this site already
 * shows inline right under the input via <Field>/<InputError> — and a
 * handful of one-off `back()->withErrors(['word' => 'A full sentence.'])`
 * calls describing why a whole ACTION failed, not a field
 * (CartController's "That one is sold out.", UserController's self-guard
 * rejections, OrderStatusController's illegal-transition message, etc.).
 * Toasting the first kind would duplicate the inline error right next to
 * it; toasting the second is exactly the fix for it currently having NO
 * visible feedback at all in several places (see CLAUDE.md's Phase 6a/toast
 * notes). This list is every such action-message key in the codebase today
 * — add to it when a new controller introduces the same pattern.
 */
const ACTION_ERROR_KEYS = ['cart', 'payment', 'user', 'variant', 'status'];

/**
 * flash.success and status are two different backend mechanisms for the
 * same idea (our own controllers' `back()->with('success', ...)` vs.
 * Breeze's `session('status')` on the auth pages) — both surface as one
 * success toast.
 */
function extractSuccessToasts(props) {
    const status = props.status ? (STATUS_MESSAGES[props.status] ?? props.status) : null;
    const message = props.flash?.success ?? status;

    return message ? [{ type: 'success', message }] : [];
}

/**
 * errors is Inertia's own validation/withErrors() bag — one toast per
 * ACTION_ERROR_KEYS entry present (see its comment for why not every key).
 * Takes the errors object directly, not page.props — Inertia's 'error'
 * event hands it over as `event.detail.errors`, already unwrapped.
 */
function extractErrorToasts(errors) {
    if (!errors || typeof errors !== 'object') return [];

    return ACTION_ERROR_KEYS.filter((key) => errors[key]).map((key) => ({
        type: 'error',
        message: errors[key],
    }));
}

/**
 * Turns whatever the backend just flashed into toasts. Reacts to Inertia's
 * own router events rather than diffing prop VALUES — two identical
 * messages back to back (e.g. "Removed from your cart." twice) still get
 * their own toast each, where a value-keyed effect would wrongly treat the
 * second as "nothing changed" since the string is the same.
 *
 * Inertia fires exactly one of two GLOBAL events per completed visit, never
 * both: 'success' (`detail: { page }`) when the response has no validation
 * errors, or 'error' (`detail: { errors }`, already unwrapped from props)
 * when it does — confirmed by reading @inertiajs/core's source, not
 * documented behavior assumed from the name. A hook that only listened for
 * 'success' would never see an error response at all.
 *
 * Used by both Components/Admin/ToastStack.jsx and
 * Components/Storefront/ToastStack.jsx — this hook is the only thing they
 * share; presentation is separate per the project's admin/storefront split.
 */
export function useFlashToasts() {
    const initialProps = usePage().props;
    const [toasts, setToasts] = useState([]);
    const timers = useRef({});
    const hasMounted = useRef(false);

    const dismiss = (id) => {
        clearTimeout(timers.current[id]);
        delete timers.current[id];
        setToasts((current) => current.filter((toast) => toast.id !== id));
    };

    useEffect(() => {
        const pushAll = (items) => {
            items.forEach(({ type, message }) => {
                const id = ++nextId;
                setToasts((current) => [...current, { id, type, message }]);
                timers.current[id] = setTimeout(() => dismiss(id), type === 'error' ? 6000 : 4000);
            });
        };

        if (!hasMounted.current) {
            hasMounted.current = true;
            pushAll([...extractSuccessToasts(initialProps), ...extractErrorToasts(initialProps.errors)]);
        }

        const offSuccess = router.on('success', (event) => {
            pushAll(extractSuccessToasts(event.detail.page.props));
        });
        const offError = router.on('error', (event) => {
            pushAll(extractErrorToasts(event.detail.errors));
        });

        return () => {
            offSuccess();
            offError();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const activeTimers = timers.current;
        return () => {
            Object.values(activeTimers).forEach(clearTimeout);
        };
    }, []);

    return { toasts, dismiss };
}
