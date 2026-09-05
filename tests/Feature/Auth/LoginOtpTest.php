<?php

namespace Tests\Feature\Auth;

use App\Mail\OtpCodeMail;
use App\Models\OtpCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Login now needs two steps: correct credentials (AuthenticatedSessionController),
 * then an emailed code (LoginOtpController) before a real session exists.
 */
class LoginOtpTest extends TestCase
{
    use RefreshDatabase;

    public function test_correct_credentials_do_not_log_in_yet_and_send_a_code(): void
    {
        Mail::fake();
        $user = User::factory()->create(['password' => bcrypt('password')]);

        $this->post(route('login'), [
            'email' => $user->email,
            'password' => 'password',
        ])->assertRedirect(route('login.otp.create'));

        $this->assertGuest();
        Mail::assertSent(OtpCodeMail::class, fn ($mail) => $mail->hasTo($user->email) && $mail->purpose === OtpCode::PURPOSE_LOGIN);
    }

    public function test_the_correct_code_completes_login(): void
    {
        Mail::fake();
        $user = User::factory()->create(['password' => bcrypt('password')]);
        $this->post(route('login'), ['email' => $user->email, 'password' => 'password']);

        $code = $this->capturedLoginCode();

        $this->post(route('login.otp.store'), ['code' => $code])
            ->assertRedirect(route('dashboard'));

        $this->assertAuthenticatedAs($user);
    }

    public function test_the_otp_page_is_unreachable_without_first_passing_credentials(): void
    {
        $this->get(route('login.otp.create'))
            ->assertRedirect(route('login'));
    }

    public function test_a_wrong_code_does_not_log_in(): void
    {
        Mail::fake();
        $user = User::factory()->create(['password' => bcrypt('password')]);
        $this->post(route('login'), ['email' => $user->email, 'password' => 'password']);

        $this->post(route('login.otp.store'), ['code' => '000000'])
            ->assertSessionHasErrors('code');

        $this->assertGuest();
    }

    public function test_resend_issues_a_new_code(): void
    {
        Mail::fake();
        $user = User::factory()->create(['password' => bcrypt('password')]);
        $this->post(route('login'), ['email' => $user->email, 'password' => 'password']);

        $firstCode = $this->capturedLoginCode();

        $this->post(route('login.otp.resend'))->assertSessionHasNoErrors();

        $secondCode = $this->capturedLoginCode(nth: 1);

        $this->assertNotSame($firstCode, $secondCode);
        // The old code no longer works once a new one is issued.
        $this->post(route('login.otp.store'), ['code' => $firstCode])
            ->assertSessionHasErrors('code');
        $this->assertGuest();
    }

    public function test_a_deactivated_account_never_reaches_the_otp_step(): void
    {
        Mail::fake();
        $user = User::factory()->create(['password' => bcrypt('password'), 'is_active' => false]);

        $this->post(route('login'), ['email' => $user->email, 'password' => 'password'])
            ->assertSessionHasErrors('email');

        Mail::assertNothingSent();
    }

    private function capturedLoginCode(int $nth = 0): string
    {
        $captured = [];
        Mail::assertSent(OtpCodeMail::class, function ($mail) use (&$captured) {
            $captured[] = $mail->code;

            return true;
        });

        return $captured[$nth];
    }
}
