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
    // Nothing is excluded. There is no payment gateway posting to this app
    // any more — every payment is confirmed by a signed-in staff member in
    // the admin panel, so every route can carry a CSRF token.
    protected $except = [
        //
    ];
}
