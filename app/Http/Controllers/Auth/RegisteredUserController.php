<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\OtpCode;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * This does NOT complete the sign-up — same seam login and checkout
     * already have. The row is created but left unverified (`email_verified_at`
     * null) and NOT logged in; RegisterOtpController::store() is what actually
     * finishes it once the emailed code checks out.
     *
     * The user row has to exist first because `otp_codes.user_id` is a real FK
     * — stashing the form in the session the way checkout does isn't an option
     * without a nullable-user OTP, which isn't worth a migration for this.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => [
                'required', 'string', 'email', 'max:255',
                // Deliberately looser than a plain `unique:users`: an address
                // that only ever got as far as an unverified row is NOT taken.
                // Otherwise abandoning the code screen (closed tab, code never
                // arrived) locks that address out of the site permanently.
                Rule::unique(User::class)->whereNotNull('email_verified_at'),
            ],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        // Re-registering over an unverified row overwrites it rather than
        // creating a second one. Safe: nobody has ever proven they own that
        // address, so there is no account here to protect yet.
        $user = User::where('email', $request->email)->whereNull('email_verified_at')->first();

        if ($user) {
            $user->forceFill([
                'name' => $request->name,
                'password' => Hash::make($request->password),
            ])->save();
        } else {
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
            ]);
        }

        if (! OtpCode::issueAndSend($user, OtpCode::PURPOSE_REGISTER)) {
            return back()->withErrors([
                'email' => "We couldn't send a verification code to that address. Please check it and try again.",
            ]);
        }

        $request->session()->put(RegisterOtpController::SESSION_KEY, $user->id);

        return redirect()->route('register.otp.create');
    }
}
