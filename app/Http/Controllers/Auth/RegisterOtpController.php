<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\OtpCode;
use App\Models\User;
use App\Providers\RouteServiceProvider;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The second step of registration — see RegisteredUserController::store()'s
 * docblock. A session key (`otp_register_user_id`), not the auth guard, is
 * what proves someone got past step one: the row exists but is unverified
 * and unusable until the emailed code lands here.
 */
class RegisterOtpController extends Controller
{
    public const SESSION_KEY = 'otp_register_user_id';

    public function create(Request $request): Response|RedirectResponse
    {
        $userId = $request->session()->get(self::SESSION_KEY);

        if (! $userId) {
            return redirect()->route('register');
        }

        return Inertia::render('Auth/VerifyRegisterOtp', [
            'email' => User::find($userId)->email ?? null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $userId = $request->session()->get(self::SESSION_KEY);

        abort_unless($userId, 403);

        $request->validate(['code' => ['required', 'string']]);

        $otp = OtpCode::currentFor($userId, OtpCode::PURPOSE_REGISTER);

        if (! $otp || ! $otp->attempt($request->input('code'))) {
            return back()->withErrors([
                'code' => 'That code is incorrect or has expired.',
            ]);
        }

        $user = User::findOrFail($userId);

        // Only now is the address proven to belong to whoever is sitting
        // here — which is the entire point of this step.
        $user->forceFill(['email_verified_at' => now()])->save();

        $request->session()->forget(self::SESSION_KEY);

        event(new Registered($user));

        Auth::login($user);
        $request->session()->regenerate();

        return redirect(RouteServiceProvider::HOME);
    }

    public function resend(Request $request): RedirectResponse
    {
        $userId = $request->session()->get(self::SESSION_KEY);

        abort_unless($userId, 403);

        $user = User::findOrFail($userId);

        if (! OtpCode::issueAndSend($user, OtpCode::PURPOSE_REGISTER)) {
            return back()->withErrors([
                'code' => "We couldn't send that code right now. Please try again in a moment.",
            ]);
        }

        return back()->with('success', 'A new code has been sent.');
    }
}
