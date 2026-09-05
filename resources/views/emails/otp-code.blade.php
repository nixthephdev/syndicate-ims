<!DOCTYPE html>
<html>
<body style="margin:0; padding:0; background:#0b0b0b; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0b; padding:40px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#161616; border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:32px;">
                    <tr>
                        <td>
                            <p style="margin:0 0 4px; color:#ccff00; font-size:11px; letter-spacing:0.2em; text-transform:uppercase; font-weight:bold;">
                                Syndicate
                            </p>
                            <h1 style="margin:0 0 16px; color:#ffffff; font-size:20px;">
                                @if ($purpose === \App\Models\OtpCode::PURPOSE_LOGIN)
                                    Your sign-in code
                                @else
                                    Confirm your order
                                @endif
                            </h1>
                            <p style="margin:0 0 24px; color:rgba(255,255,255,0.6); font-size:14px; line-height:1.6;">
                                @if ($purpose === \App\Models\OtpCode::PURPOSE_LOGIN)
                                    Enter this code to finish signing in to your account.
                                @else
                                    Enter this code to confirm and place your order.
                                @endif
                            </p>
                            <p style="margin:0 0 24px; text-align:center;">
                                <span style="display:inline-block; background:#0b0b0b; border:2px solid #ccff00; border-radius:6px; padding:16px 24px; color:#ffffff; font-size:32px; font-weight:bold; letter-spacing:0.3em;">
                                    {{ $code }}
                                </span>
                            </p>
                            <p style="margin:0; color:rgba(255,255,255,0.4); font-size:12px; line-height:1.6;">
                                This code expires in {{ $minutes }} minutes. If you didn't request this, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
