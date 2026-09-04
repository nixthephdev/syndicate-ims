<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    /**
     * The URIs that should be excluded from CSRF verification.
     *
     * @var array<int, string>
     */
    protected $except = [
        // PayMongo's servers, not a logged-in browser — no session, no
        // CSRF token to carry. PayMongoWebhookVerifier's signature check
        // is what authenticates this route instead.
        'webhooks/paymongo',
    ];
}
