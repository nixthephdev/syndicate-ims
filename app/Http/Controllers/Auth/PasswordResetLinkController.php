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
 * Step one of a password reset: prove you can read the mailbox.
 *
 * This used to email Laravel's signed reset LINK (Password::sendResetLink).
 * It now emails a 6-digit code instead, matching registration and checkout —
 * one mechanism for "prove this address is yours", not two. The
 * password_reset_tokens table and Password broker are consequently unused
 * by this flow; OtpCode carries the expiry and attempt cap itself.
 *
 * Class name kept as-is so route/controller references elsewhere don't
 * churn, even though nothing sends a "link" any more.
 */
class PasswordResetLinkController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/ForgotPassword', [
            'status' => session('status'),
        ]);
    }

    /**
     * Issue the code — but never reveal whether the address has an account.
     *
     * An unknown address gets the SAME redirect to the same code screen as a
     * real one; only the sending differs. Laravel's own broker would throw a
     * validation error naming the miss ("We can't find a user with that
     * email"), which turns this form into an account-enumeration oracle —
     * paste a list of addresses, read back which ones are customers here.
     * The code screen then simply rejects whatever gets typed, because no
     * code was ever issued.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        if ($user) {
            // A failed send is deliberately NOT surfaced either — reporting
            // it would leak the same fact the branch above hides.
            OtpCode::issueAndSend($user, OtpCode::PURPOSE_PASSWORD_RESET);
        }

        $request->session()->put(PasswordResetOtpController::SESSION_EMAIL, $request->email);

        return redirect()->route('password.otp.create');
    }
}
