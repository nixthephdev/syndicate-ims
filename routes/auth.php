<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\PasswordResetOtpController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\RegisterOtpController;
use App\Http\Controllers\Auth\VerifyEmailController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('register', [RegisteredUserController::class, 'create'])
                ->name('register');

    Route::post('register', [RegisteredUserController::class, 'store']);

    // Step two of registration — see RegisteredUserController::store()'s
    // docblock. 'guest' fits: the row exists but nobody is signed in until
    // the emailed code is verified here.
    Route::get('register/otp', [RegisterOtpController::class, 'create'])->name('register.otp.create');
    Route::post('register/otp', [RegisterOtpController::class, 'store'])->name('register.otp.store');
    Route::post('register/otp/resend', [RegisterOtpController::class, 'resend'])->name('register.otp.resend');

    Route::get('login', [AuthenticatedSessionController::class, 'create'])
                ->name('login');

    Route::post('login', [AuthenticatedSessionController::class, 'store']);

    // Password reset, in three steps. There is no signed reset LINK any
    // more — an emailed 6-digit code replaced it, so `password.reset` takes
    // no {token} and is gated on a verified session instead. See
    // PasswordResetOtpController for the two session keys involved.
    Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])
                ->name('password.request');

    Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])
                ->name('password.email');

    Route::get('forgot-password/verify', [PasswordResetOtpController::class, 'create'])
                ->name('password.otp.create');

    Route::post('forgot-password/verify', [PasswordResetOtpController::class, 'store'])
                ->name('password.otp.store');

    Route::post('forgot-password/verify/resend', [PasswordResetOtpController::class, 'resend'])
                ->name('password.otp.resend');

    Route::get('reset-password', [NewPasswordController::class, 'create'])
                ->name('password.reset');

    Route::post('reset-password', [NewPasswordController::class, 'store'])
                ->name('password.store');
});

Route::middleware('auth')->group(function () {
    Route::get('verify-email', EmailVerificationPromptController::class)
                ->name('verification.notice');

    Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)
                ->middleware(['signed', 'throttle:6,1'])
                ->name('verification.verify');

    Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
                ->middleware('throttle:6,1')
                ->name('verification.send');

    Route::get('confirm-password', [ConfirmablePasswordController::class, 'show'])
                ->name('password.confirm');

    Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);

    Route::put('password', [PasswordController::class, 'update'])->name('password.update');

    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
                ->name('logout');
});
