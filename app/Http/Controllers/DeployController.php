<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Artisan;

/**
 * A migration trigger reachable over plain HTTP — for a host with no SSH
 * access at all (see the Deployment section of CLAUDE.md), where there is
 * otherwise no way to run `php artisan migrate` on the server. Laravel can
 * execute Artisan commands in-process from any web request; this route is
 * just a deliberately narrow, token-gated door to that.
 *
 * Gated by a long random token (DEPLOY_TOKEN in .env), compared with
 * hash_equals() to avoid a timing side-channel — not by auth, since this
 * has to work on a freshly-uploaded deploy before anyone has ever logged
 * in. Empty/unset token disables the route entirely (404), so it is
 * inert everywhere this isn't actually needed (e.g. the Hostinger SSH
 * deploy this project already has working).
 *
 * Deliberately migrate-only, not a general command-runner. The blast
 * radius of "the wrong migration ran" is recoverable — migrations are
 * meant to be re-run/rolled back. "The wrong arbitrary artisan command
 * ran" is not a risk worth this endpoint carrying.
 */
class DeployController extends Controller
{
    public function migrate(Request $request): Response
    {
        $token = config('services.deploy.token');

        abort_if(! $token, 404);
        abort_unless(hash_equals($token, (string) $request->query('token')), 403);

        Artisan::call('migrate', ['--force' => true]);

        return response(Artisan::output(), 200)->header('Content-Type', 'text/plain');
    }
}
