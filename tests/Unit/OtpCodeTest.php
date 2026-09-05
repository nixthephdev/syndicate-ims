<?php

namespace Tests\Unit;

use App\Models\OtpCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OtpCodeTest extends TestCase
{
    use RefreshDatabase;

    public function test_issuing_a_code_returns_a_six_digit_string(): void
    {
        $user = User::factory()->create();

        [, $code] = OtpCode::issue($user, OtpCode::PURPOSE_PASSWORD_RESET);

        $this->assertSame(6, strlen($code));
        $this->assertMatchesRegularExpression('/^\d{6}$/', $code);
    }

    public function test_the_correct_code_verifies_once(): void
    {
        $user = User::factory()->create();
        [$otp, $code] = OtpCode::issue($user, OtpCode::PURPOSE_PASSWORD_RESET);

        $this->assertTrue($otp->attempt($code));
        // Already used — a second attempt with the same correct code fails.
        $this->assertFalse($otp->attempt($code));
    }

    public function test_a_wrong_code_fails(): void
    {
        $user = User::factory()->create();
        [$otp] = OtpCode::issue($user, OtpCode::PURPOSE_PASSWORD_RESET);

        $this->assertFalse($otp->attempt('000000'));
    }

    public function test_an_expired_code_fails_even_if_correct(): void
    {
        $user = User::factory()->create();
        [$otp, $code] = OtpCode::issue($user, OtpCode::PURPOSE_PASSWORD_RESET);
        $otp->forceFill(['expires_at' => now()->subMinute()])->save();

        $this->assertFalse($otp->attempt($code));
    }

    public function test_too_many_wrong_attempts_locks_out_the_correct_code_too(): void
    {
        $user = User::factory()->create();
        [$otp, $code] = OtpCode::issue($user, OtpCode::PURPOSE_PASSWORD_RESET);

        for ($i = 0; $i < OtpCode::MAX_ATTEMPTS; $i++) {
            $otp->attempt('000000');
        }

        $this->assertFalse($otp->attempt($code));
    }

    public function test_issuing_a_new_code_invalidates_the_previous_unused_one(): void
    {
        $user = User::factory()->create();
        [$first, $firstCode] = OtpCode::issue($user, OtpCode::PURPOSE_PASSWORD_RESET);
        [$second, $secondCode] = OtpCode::issue($user, OtpCode::PURPOSE_PASSWORD_RESET);

        $this->assertNull(OtpCode::find($first->id));
        $this->assertNotSame($firstCode, $secondCode);
        $this->assertTrue($second->attempt($secondCode));
    }

    public function test_a_code_issued_for_one_purpose_does_not_verify_for_another(): void
    {
        $user = User::factory()->create();
        [, $code] = OtpCode::issue($user, OtpCode::PURPOSE_PASSWORD_RESET);

        $checkoutOtp = OtpCode::currentFor($user->id, OtpCode::PURPOSE_CHECKOUT);

        $this->assertNull($checkoutOtp);
    }
}
