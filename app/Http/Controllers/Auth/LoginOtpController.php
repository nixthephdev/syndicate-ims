<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\OtpCodeMail;
use App\Models\OtpCode;
use App\Models\User;
use App\Providers\RouteServiceProvider;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The second step of login — see AuthenticatedSessionController::store()'s
 * docblock. A session key (`otp_login_user_id`), not the auth guard, is
 * what proves someone got past step one: credentials were right, but no
 * real session exists until the emailed code is verified here too.
 */
class LoginOtpController extends Controller
{
    public function create(Request $request): Response|RedirectResponse
    {
        if (! $request->session()->has('otp_login_user_id')) {
            return redirect()->route('login');
        }

        return Inertia::render('Auth/VerifyLoginOtp');
    }

    public function store(Request $request): RedirectResponse
    {
        $userId = $request->session()->get('otp_login_user_id');

        abort_unless($userId, 403);

        $request->validate(['code' => ['required', 'string']]);

        $otp = OtpCode::currentFor($userId, OtpCode::PURPOSE_LOGIN);

        if (! $otp || ! $otp->attempt($request->input('code'))) {
            return back()->withErrors([
                'code' => 'That code is incorrect or has expired.',
            ]);
        }

        $user = User::findOrFail($userId);
        $remember = $request->session()->pull('otp_login_remember', false);
        $request->session()->forget('otp_login_user_id');

        Auth::login($user, $remember);
        $request->session()->regenerate();

        return redirect()->intended(RouteServiceProvider::HOME);
    }

    public function resend(Request $request): RedirectResponse
    {
        $userId = $request->session()->get('otp_login_user_id');

        abort_unless($userId, 403);

        $user = User::findOrFail($userId);
        [, $code] = OtpCode::issue($user, OtpCode::PURPOSE_LOGIN);
        Mail::to($user->email)->send(new OtpCodeMail($code, OtpCode::PURPOSE_LOGIN));

        return back()->with('success', 'A new code has been sent.');
    }
}
