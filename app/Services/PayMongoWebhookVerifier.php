<?php

namespace App\Services;

/**
 * Verifies the `Paymongo-Signature` header PayMongo attaches to every
 * webhook request. Format (confirmed against PayMongo's own docs, 2026-09):
 *
 *   t=1496734173,te=<test-mode-hmac>,li=<live-mode-hmac>
 *
 * The signed string is "{t}.{raw request body}", HMAC-SHA256'd with the
 * webhook's own secret (a DIFFERENT key from the API secret key — see
 * config/services.php). Verify against `te` in test mode, `li` in live —
 * PayMongo signs both on every webhook regardless of which mode fired it,
 * so picking the wrong one always fails, on purpose.
 *
 * Deliberately a standalone class, not a method buried in the controller:
 * signature verification is the one part of this integration where a subtle
 * bug is a real security hole (a forged webhook could mark any order paid
 * for free), so it gets to be tested on its own.
 */
class PayMongoWebhookVerifier
{
    public function __construct(private ?string $webhookSecret = null)
    {
        $this->webhookSecret = $webhookSecret ?? config('services.paymongo.webhook_secret');
    }

    public function verify(string $rawBody, ?string $signatureHeader, bool $liveMode): bool
    {
        if (! $this->webhookSecret || ! $signatureHeader) {
            return false;
        }

        $parts = $this->parseHeader($signatureHeader);
        $timestamp = $parts['t'] ?? null;
        $expected = $liveMode ? ($parts['li'] ?? null) : ($parts['te'] ?? null);

        if (! $timestamp || ! $expected) {
            return false;
        }

        $signedPayload = $timestamp.'.'.$rawBody;
        $computed = hash_hmac('sha256', $signedPayload, $this->webhookSecret);

        return hash_equals($expected, $computed);
    }

    /** @return array<string, string> */
    private function parseHeader(string $header): array
    {
        $parts = [];

        foreach (explode(',', $header) as $segment) {
            [$key, $value] = array_pad(explode('=', $segment, 2), 2, null);

            if ($key !== null && $value !== null) {
                $parts[trim($key)] = trim($value);
            }
        }

        return $parts;
    }
}
