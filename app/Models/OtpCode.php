<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A one-time 6-digit email code, used for two genuinely different things —
 * login 2FA and a checkout confirmation step — kept as one table with a
 * `purpose` column rather than two, since the issue/verify/expire/rate-limit
 * logic is identical either way and the two are never valid for each other
 * (a login code can't confirm a checkout, checked via the purpose column).
 *
 * No enums — PHP 8.0. Class constants instead, same as Order::STATUS_*.
 */
class OtpCode extends Model
{
    public const PURPOSE_LOGIN = 'login';
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
