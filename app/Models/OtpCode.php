<?php

namespace App\Models;

use App\Mail\OtpCodeMail;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * A one-time 6-digit email code, used for three genuinely different things —
 * proving email ownership at registration, proving it again before a
 * password reset, and confirming a checkout — kept as one table with a
 * `purpose` column rather than three, since the issue/verify/expire/
 * rate-limit logic is identical either way and none are ever valid for each
 * other (a registration code cannot be replayed to reset a password or
 * confirm a checkout, checked via the purpose column).
 *
 * Signing in deliberately does NOT use one: password-only login was the
 * scoped decision, on the grounds that these three moments (create an
 * account, hand over account access, spend money) are where the extra step
 * actually buys something.
 *
 * No enums — PHP 8.0. Class constants instead, same as Order::STATUS_*.
 */
class OtpCode extends Model
{
    public const PURPOSE_REGISTER = 'register';
    public const PURPOSE_PASSWORD_RESET = 'password_reset';
    public const PURPOSE_CHECKOUT = 'checkout';

    public const MAX_ATTEMPTS = 5;
    public const LIFETIME_MINUTES = 10;

    protected $fillable = [
        'user_id',
        'purpose',
        'code_hash',
        'attempts',
        'expires_at',
        'used_at',
    ];

    protected $casts = [
        'attempts' => 'integer',
        'expires_at' => 'datetime',
        'used_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Issues a fresh code, invalidating any earlier unused one for the same
     * user+purpose first — only ever one live code per purpose at a time,
     * so an old "resend" doesn't leave two valid codes both able to pass.
     *
     * @return array{0: self, 1: string} the record, and the raw code to email
     */
    public static function issue(User $user, string $purpose): array
    {
        static::where('user_id', $user->id)
            ->where('purpose', $purpose)
            ->whereNull('used_at')
            ->delete();

        $code = (string) random_int(100000, 999999);

        $otp = static::create([
            'user_id' => $user->id,
            'purpose' => $purpose,
            'code_hash' => static::hash($code),
            'expires_at' => now()->addMinutes(self::LIFETIME_MINUTES),
        ]);

        return [$otp, $code];
    }

    /**
     * Issues a code and actually gets it to the user — the only two lines
     * every caller ever wants, always together.
     *
     * Returns false, rather than throwing, when the mail transport is down.
     * A misconfigured or unreachable SMTP host used to surface as a raw 500
     * mid-checkout (losing the cart) or mid-login; a caller that gets false
     * back can say "we couldn't send your code" and leave the visitor
     * somewhere they can retry. The failure is logged, not swallowed.
     */
    public static function issueAndSend(User $user, string $purpose): bool
    {
        [, $code] = static::issue($user, $purpose);

        try {
            Mail::to($user->email)->send(new OtpCodeMail($code, $purpose));
        } catch (\Throwable $e) {
            Log::error('Failed to send OTP code', [
                'user_id' => $user->id,
                'purpose' => $purpose,
                'error' => $e->getMessage(),
            ]);

            return false;
        }

        return true;
    }

    /**
     * Finds the current live (unused, unexpired) code for a user+purpose —
     * the thing to check a submitted code against.
     */
    public static function currentFor(int $userId, string $purpose): ?self
    {
        return static::where('user_id', $userId)
            ->where('purpose', $purpose)
            ->whereNull('used_at')
            ->latest()
            ->first();
    }

    /**
     * Checks a submitted code against this record. Every call counts as an
     * attempt, right or wrong — that's what makes the attempt cap mean
     * anything. hash_equals(), not ==, even though both sides are already
     * hashes: this is a secret-comparison, timing-safety costs nothing here.
     */
    public function attempt(string $code): bool
    {
        if ($this->used_at !== null || $this->expires_at->isPast() || $this->attempts >= self::MAX_ATTEMPTS) {
            return false;
        }

        $this->increment('attempts');

        if (! hash_equals($this->code_hash, static::hash($code))) {
            return false;
        }

        $this->forceFill(['used_at' => now()])->save();

        return true;
    }

    private static function hash(string $code): string
    {
        return hash('sha256', $code);
    }
}
