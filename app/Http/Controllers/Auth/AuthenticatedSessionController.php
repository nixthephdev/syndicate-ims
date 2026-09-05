<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Mail\OtpCodeMail;
use App\Models\OtpCode;
use App\Providers\RouteServiceProvider;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     *
     * Credentials verified (LoginRequest::authenticate() already checked
     * password + active status via Auth::attempt()), but the session is
     * deliberately NOT kept — logged straight back out, and the real
     * session only gets established in Auth\LoginOtpController once the
     * emailed code is verified. See that controller's docblock for why
     * this lives as a separate step rather than inside LoginRequest.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $user = Auth::user();
        Auth::logout();

        [, $code] = OtpCode::issue($user, OtpCode::PURPOSE_LOGIN);
        Mail::to($user->email)->send(new OtpCodeMail($code, OtpCode::PURPOSE_LOGIN));

        $request->session()->put('otp_login_user_id', $user->id);
        $request->session()->put('otp_login_remember', $request->boolean('remember'));

        return redirect()->route('login.otp.create');
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
