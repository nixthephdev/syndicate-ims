<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return string|null
     */
    protected function redirectTo($request)
    {
        if (! $request->expectsJson()) {
            // Quick Add / Add to Cart / the customizer's Add to Cart now
            // require sign-in. This flag lets the login page explain why
            // someone bounced there instead of the generic "please log in".
            if (in_array($request->route()?->getName(), ['cart.store', 'customize.store'], true)) {
                return route('login', ['reason' => 'cart']);
            }

            return route('login');
        }
    }
}
