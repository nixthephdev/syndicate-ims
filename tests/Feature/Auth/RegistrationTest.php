<?php

namespace Tests\Feature\Auth;

use App\Mail\OtpCodeMail;
use App\Models\OtpCode;
use App\Models\User;
use App\Providers\RouteServiceProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    private array $form = [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ];

    /**
     * Reads the emailed code back off the faked Mailable — same trick
     * Tests\Concerns\CompletesCheckoutOtp uses. Requires Mail::fake().
     */
    private function sentCode(): string
    {
        $code = null;

        Mail::assertSent(OtpCodeMail::class, function ($mail) use (&$code) {
            $code = $mail->code;

            return true;
        });

        return $code;
    }

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_registering_does_not_sign_you_in_until_the_code_is_verified(): void
    {
        Mail::fake();

        $response = $this->post('/register', $this->form);

        $response->assertRedirect(route('register.otp.create'));
        $this->assertGuest();

        Mail::assertSent(OtpCodeMail::class);

        // The row exists, but unverified and unusable.
        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com',
            'email_verified_at' => null,
        ]);
    }

    public function test_new_users_can_register_by_verifying_the_emailed_code(): void
    {
        Mail::fake();

        $this->post('/register', $this->form);

        $response = $this->post(route('register.otp.store'), ['code' => $this->sentCode()]);

        $this->assertAuthenticated();
        $response->assertRedirect(RouteServiceProvider::HOME);
        $this->assertNotNull(User::where('email', 'test@example.com')->first()->email_verified_at);
    }

    public function test_a_wrong_code_does_not_complete_registration(): void
    {
        Mail::fake();

        $this->post('/register', $this->form);

        $response = $this->post(route('register.otp.store'), ['code' => '000000']);

        $response->assertSessionHasErrors('code');
        $this->assertGuest();
        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com',
            'email_verified_at' => null,
        ]);
    }

    public function test_the_otp_screen_is_unreachable_without_starting_registration(): void
    {
        $this->get(route('register.otp.create'))->assertRedirect(route('register'));
        $this->post(route('register.otp.store'), ['code' => '123456'])->assertForbidden();
    }

    public function test_a_code_for_another_purpose_cannot_finish_a_registration(): void
    {
        Mail::fake();

        $this->post('/register', $this->form);

        $user = User::where('email', 'test@example.com')->firstOrFail();
        [, $otherPurposeCode] = OtpCode::issue($user, OtpCode::PURPOSE_PASSWORD_RESET);

        $this->post(route('register.otp.store'), ['code' => $otherPurposeCode])
            ->assertSessionHasErrors('code');

        $this->assertGuest();
    }

    public function test_an_abandoned_unverified_registration_does_not_lock_the_address_out(): void
    {
        Mail::fake();

        // First attempt: never verified, tab closed.
        $this->post('/register', $this->form);
        $firstId = User::where('email', 'test@example.com')->firstOrFail()->id;

        // Second attempt with the same address must be allowed through,
        // overwriting the orphaned row rather than creating a second one.
        $this->post('/register', array_merge($this->form, [
            'name' => 'Second Go',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]))->assertRedirect(route('register.otp.create'));

        $this->assertSame(1, User::where('email', 'test@example.com')->count());

        $user = User::find($firstId);
        $this->assertSame('Second Go', $user->name);
        $this->assertTrue(Hash::check('new-password', $user->password));
    }

    public function test_a_verified_address_is_still_taken(): void
    {
        Mail::fake();

        User::factory()->create([
            'email' => 'test@example.com',
            'email_verified_at' => now(),
        ]);

        $this->post('/register', $this->form)->assertSessionHasErrors('email');

        Mail::assertNothingSent();
    }
}
