<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Step three of a password reset: set the new password.
 *
 * There is no `token` any more — the emailed 6-digit code replaced the
 * signed link, so what authorises this page is
 * PasswordResetOtpController::SESSION_VERIFIED, written only after a correct
 * code. The email is read from that verified session id too, never from
 * request input: taking it from the form would let someone who verified a
 * code for their OWN address post a different address here and reset a
 * stranger's password.
 */
class NewPasswordController extends Controller
{
    public function create(Request $request): Response|RedirectResponse
    {
        $userId = $request->session()->get(PasswordResetOtpController::SESSION_VERIFIED);

        if (! $userId) {
            return redirect()->route('password.request');
        }

        return Inertia::render('Auth/ResetPassword', [
            'email' => User::find($userId)->email ?? null,
        ]);
    }

    /**
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $userId = $request->session()->get(PasswordResetOtpController::SESSION_VERIFIED);

        abort_unless($userId, 403);

        $request->validate([
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::findOrFail($userId);

        $user->forceFill([
            'password' => Hash::make($request->password),
            // Invalidates any "remember me" cookie still out there — the
            // point of a reset is often that someone else had access.
            'remember_token' => Str::random(60),
        ])->save();

        event(new PasswordReset($user));

        // Both keys go, so a back-button revisit can't reset the password a
        // second time on a session that already spent its one verification.
        $request->session()->forget([
            PasswordResetOtpController::SESSION_VERIFIED,
            PasswordResetOtpController::SESSION_EMAIL,
        ]);

        return redirect()->route('login')->with('status', 'Your password has been reset. Sign in with your new password.');
    }
}
