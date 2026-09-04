<?php

namespace Tests\Unit;

use App\Services\PayMongoWebhookVerifier;
use Tests\TestCase;

/**
 * The one part of the PayMongo integration where a subtle bug is a real
 * security hole — a forged webhook could mark any order paid for free.
 * Pure logic, no DB/HTTP, so it gets its own fast unit test rather than
 * only being exercised indirectly through the webhook controller.
 */
class PayMongoWebhookVerifierTest extends TestCase
{
    private const SECRET = 'whsec_test_12345';

    private function signedHeader(string $body, int $timestamp, bool $liveMode = false): string
    {
        $computed = hash_hmac('sha256', $timestamp.'.'.$body, self::SECRET);
        $key = $liveMode ? 'li' : 'te';

        // Both te and li are always present on a real header — only the
        // mode matching how the signature was actually computed is valid.
        $other = hash_hmac('sha256', $timestamp.'.'.$body.'-wrong-mode', self::SECRET);
        $otherKey = $liveMode ? 'te' : 'li';

        return "t={$timestamp},{$key}={$computed},{$otherKey}={$other}";
    }

    public function test_a_correctly_signed_test_mode_webhook_verifies(): void
    {
        $verifier = new PayMongoWebhookVerifier(self::SECRET);
        $body = '{"data":{"id":"evt_123"}}';
        $header = $this->signedHeader($body, time());

        $this->assertTrue($verifier->verify($body, $header, false));
    }

    public function test_a_correctly_signed_live_mode_webhook_verifies(): void
    {
        $verifier = new PayMongoWebhookVerifier(self::SECRET);
        $body = '{"data":{"id":"evt_123"}}';
        $header = $this->signedHeader($body, time(), liveMode: true);

        $this->assertTrue($verifier->verify($body, $header, true));
    }

    public function test_verifying_against_the_wrong_mode_fails(): void
    {
        $verifier = new PayMongoWebhookVerifier(self::SECRET);
        $body = '{"data":{"id":"evt_123"}}';
        // Signed as test-mode, verified as if it were live.
        $header = $this->signedHeader($body, time(), liveMode: false);

        $this->assertFalse($verifier->verify($body, $header, true));
    }

    public function test_a_tampered_body_fails_verification(): void
    {
        $verifier = new PayMongoWebhookVerifier(self::SECRET);
        $header = $this->signedHeader('{"data":{"id":"evt_123"}}', time());

        $this->assertFalse($verifier->verify('{"data":{"id":"evt_999-tampered"}}', $header, false));
    }

    public function test_the_wrong_secret_fails_verification(): void
    {
        $verifier = new PayMongoWebhookVerifier('whsec_a_completely_different_secret');
        $body = '{"data":{"id":"evt_123"}}';
        $header = $this->signedHeader($body, time());

        $this->assertFalse($verifier->verify($body, $header, false));
    }

    public function test_a_missing_header_fails_verification(): void
    {
        $verifier = new PayMongoWebhookVerifier(self::SECRET);

        $this->assertFalse($verifier->verify('{}', null, false));
    }

    public function test_a_malformed_header_fails_verification(): void
    {
        $verifier = new PayMongoWebhookVerifier(self::SECRET);

        $this->assertFalse($verifier->verify('{}', 'not-a-real-signature-header', false));
    }

    public function test_no_configured_secret_fails_verification(): void
    {
        $verifier = new PayMongoWebhookVerifier(null);
        $body = '{"data":{"id":"evt_123"}}';
        $header = $this->signedHeader($body, time());

        $this->assertFalse($verifier->verify($body, $header, false));
    }
}
