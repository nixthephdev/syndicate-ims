<?php

namespace Tests\Concerns;

use App\Mail\OtpCodeMail;
use Illuminate\Support\Facades\Mail;

/**
 * checkout.store no longer creates an order directly — it stashes the form
 * and emails a code, and only checkout.otp.store actually creates the
 * order (see CheckoutController's docblock). Every test that used to post
 * straight to checkout.store and expect an Order to exist needs this one
 * extra step now. Requires Mail::fake() to already be active (call it
 * before posting to checkout.store) so the code can be read back off the
 * captured Mailable instead of a real inbox.
 */
trait CompletesCheckoutOtp
{
    private function completeCheckoutOtp(array $overrides = []): \Illuminate\Testing\TestResponse
    {
        $code = null;

        Mail::assertSent(OtpCodeMail::class, function ($mail) use (&$code) {
            $code = $mail->code;

            return true;
        });

        return $this->post(route('checkout.otp.store'), array_merge(['code' => $code], $overrides));
    }
}
