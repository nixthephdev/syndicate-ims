<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\OtpCode;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Step two of a password reset: check the emailed code.
 *
 * Two session keys, deliberately distinct:
 *
 *   SESSION_EMAIL    — set the moment a code is requested. Means only
 *                      "somebody typed this address", and grants nothing.
 *   SESSION_VERIFIED — set ONLY after a correct code. This is what lets
 *                      NewPasswordController actually change a password.
 *
 * Keeping them apart is the whole point: if one key did both jobs, merely
 * asking for a code would be enough to reach the new-password form, which
 * would let anyone reset any account they can name.
 */
class PasswordResetOtpController extends Controller
{
    public const SESSION_EMAIL = 'password_reset_email';
    public const SESSION_VERIFIED = 'password_reset_verified_user_id';

    public function create(Request $request): Response|RedirectResponse
    {
        $email = $request->session()->get(self::SESSION_EMAIL);

        if (! $email) {
            return redirect()->route('password.request');
        }

        return Inertia::render('Auth/VerifyPasswordOtp', [
            'email' => $email,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $email = $request->session()->get(self::SESSION_EMAIL);

        abort_unless($email, 403);

        $request->validate(['code' => ['required', 'string']]);

        $user = User::where('email', $email)->first();

        // Same wording whether the address has no account at all or the code
        // is simply wrong — see PasswordResetLinkController::store() for why
        // the two must stay indistinguishable from out here.
        $otp = $user ? OtpCode::currentFor($user->id, OtpCode::PURPOSE_PASSWORD_RESET) : null;

        if (! $otp || ! $otp->attempt($request->input('code'))) {
            return back()->withErrors([
                'code' => 'That code is incorrect or has expired.',
            ]);
        }

        $request->session()->put(self::SESSION_VERIFIED, $user->id);

        return redirect()->route('password.reset');
    }

    public function resend(Request $request): RedirectResponse
    {
        $email = $request->session()->get(self::SESSION_EMAIL);

        abort_unless($email, 403);

        $user = User::where('email', $email)->first();

        if ($user) {
            OtpCode::issueAndSend($user, OtpCode::PURPOSE_PASSWORD_RESET);
        }

        return back()->with('success', 'A new code has been sent.');
    }
}
