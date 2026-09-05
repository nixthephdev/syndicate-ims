<?php

namespace Tests\Feature\Auth;

use App\Mail\OtpCodeMail;
use App\Models\OtpCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Resetting a password is a 6-digit emailed code now, not a signed link —
 * see PasswordResetLinkController's docblock. Laravel's Password broker and
 * the password_reset_tokens table are no longer part of this flow.
 */
class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private function sentCode(): string
    {
        $code = null;

        Mail::assertSent(OtpCodeMail::class, function ($mail) use (&$code) {
            $code = $mail->code;

            return true;
        });

        return $code;
    }

    public function test_reset_password_screen_can_be_rendered(): void
    {
        $this->get('/forgot-password')->assertStatus(200);
    }

    public function test_requesting_a_reset_emails_a_code(): void
    {
        Mail::fake();
        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email])
            ->assertRedirect(route('password.otp.create'));

        Mail::assertSent(
            OtpCodeMail::class,
            fn ($mail) => $mail->hasTo($user->email)
                && $mail->purpose === OtpCode::PURPOSE_PASSWORD_RESET
        );
    }

    public function test_a_password_can_be_reset_with_the_emailed_code(): void
    {
        Mail::fake();
        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email]);
        $this->post(route('password.otp.store'), ['code' => $this->sentCode()])
            ->assertRedirect(route('password.reset'));

        $this->get(route('password.reset'))->assertOk();

        $this->post(route('password.store'), [
            'password' => 'brand-new-password',
            'password_confirmation' => 'brand-new-password',
        ])->assertRedirect(route('login'));

        $this->assertTrue(Hash::check('brand-new-password', $user->fresh()->password));
    }

    public function test_a_wrong_code_does_not_grant_access_to_the_new_password_form(): void
    {
        Mail::fake();
        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email]);
        $this->post(route('password.otp.store'), ['code' => '000000'])
            ->assertSessionHasErrors('code');

        $this->get(route('password.reset'))->assertRedirect(route('password.request'));
        $this->post(route('password.store'), [
            'password' => 'brand-new-password',
            'password_confirmation' => 'brand-new-password',
        ])->assertForbidden();

        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    /**
     * Merely ASKING for a code must not be enough to reach the new-password
     * form — that's the whole reason the request step and the verified step
     * write two different session keys.
     */
    public function test_requesting_a_code_alone_does_not_authorise_a_reset(): void
    {
        Mail::fake();
        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email]);

        $this->get(route('password.reset'))->assertRedirect(route('password.request'));
        $this->post(route('password.store'), [
            'password' => 'brand-new-password',
            'password_confirmation' => 'brand-new-password',
        ])->assertForbidden();

        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    /**
     * An unknown address must be indistinguishable from a known one, or this
     * form becomes an account-enumeration oracle.
     */
    public function test_an_unknown_address_looks_exactly_like_a_known_one(): void
    {
        Mail::fake();

        $this->post('/forgot-password', ['email' => 'nobody@example.com'])
            ->assertRedirect(route('password.otp.create'))
            ->assertSessionHasNoErrors();

        Mail::assertNothingSent();

        // And no code can then be guessed into working.
        $this->post(route('password.otp.store'), ['code' => '123456'])
            ->assertSessionHasErrors('code');
    }

    public function test_a_used_verification_cannot_be_replayed(): void
    {
        Mail::fake();
        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email]);
        $this->post(route('password.otp.store'), ['code' => $this->sentCode()]);
        $this->post(route('password.store'), [
            'password' => 'first-new-password',
            'password_confirmation' => 'first-new-password',
        ]);

        // Session keys are cleared on use, so a back-button repost 403s
        // instead of silently setting the password a second time.
        $this->post(route('password.store'), [
            'password' => 'second-new-password',
            'password_confirmation' => 'second-new-password',
        ])->assertForbidden();

        $this->assertTrue(Hash::check('first-new-password', $user->fresh()->password));
    }

    public function test_a_checkout_code_cannot_be_replayed_to_reset_a_password(): void
    {
        Mail::fake();
        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email]);
        [, $checkoutCode] = OtpCode::issue($user, OtpCode::PURPOSE_CHECKOUT);

        $this->post(route('password.otp.store'), ['code' => $checkoutCode])
            ->assertSessionHasErrors('code');

        $this->get(route('password.reset'))->assertRedirect(route('password.request'));
    }
}
