<?php

namespace App\Mail;

use App\Models\OtpCode;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OtpCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $code, public string $purpose)
    {
    }

    public function build()
    {
        $subjects = [
            OtpCode::PURPOSE_REGISTER => 'Confirm your email',
            OtpCode::PURPOSE_PASSWORD_RESET => 'Reset your password',
            OtpCode::PURPOSE_CHECKOUT => 'Your order confirmation code',
        ];

        $subject = $subjects[$this->purpose] ?? 'Your verification code';

        return $this->subject("Syndicate IMS: {$subject}")
            ->view('emails.otp-code')
            ->with([
                'code' => $this->code,
                'purpose' => $this->purpose,
                'minutes' => OtpCode::LIFETIME_MINUTES,
            ]);
    }
}
