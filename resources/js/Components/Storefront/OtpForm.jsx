import { useForm } from '@inertiajs/react';
import { Field, SubmitButton } from '@/Components/Storefront/FormControls';

/**
 * Shared by Auth/VerifyRegisterOtp.jsx, Auth/VerifyPasswordOtp.jsx and
 * Storefront/CheckoutOtp.jsx — same
 * "type a 6-digit code, or resend it" shape either way, just posting to a
 * different pair of routes. Two separate `useForm` instances (the code
 * form and the resend button) since they're independent requests with
 * independent processing states — resending shouldn't disable the code
 * field, and submitting a code shouldn't disable the resend link.
 */
export default function OtpForm({ submitRouteName, resendRouteName, submitLabel = 'Verify' }) {
    const { data, setData, post, processing, errors } = useForm({ code: '' });
    const resendForm = useForm({});

    const submit = (e) => {
        e.preventDefault();
        post(route(submitRouteName));
    };

    const resend = (e) => {
        e.preventDefault();
        resendForm.post(route(resendRouteName), { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <Field
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                label="Verification code"
                placeholder="123456"
                value={data.code}
                autoFocus
                error={errors.code}
                onChange={(e) => setData('code', e.target.value)}
            />

            <SubmitButton processing={processing}>
                {processing ? 'Verifying' : submitLabel}
            </SubmitButton>

            <button
                type="button"
                onClick={resend}
                disabled={resendForm.processing}
                className="block w-full text-center text-sm text-white/40 underline underline-offset-4 transition-colors hover:text-volt-500 light:text-ink-900/55 light:hover:text-volt-800 disabled:pointer-events-none disabled:opacity-40"
            >
                {resendForm.processing ? 'Sending…' : "Didn't get a code? Resend"}
            </button>
        </form>
    );
}
