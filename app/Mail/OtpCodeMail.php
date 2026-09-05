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
        $subject = $this->purpose === OtpCode::PURPOSE_LOGIN
            ? 'Your sign-in code'
            : 'Your order confirmation code';

        return $this->subject("Syndicate IMS: {$subject}")
            ->view('emails.otp-code')
            ->with([
                'code' => $this->code,
                'purpose' => $this->purpose,
                'minutes' => OtpCode::LIFETIME_MINUTES,
            ]);
    }
}
