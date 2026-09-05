<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * The web-reachable migration trigger for a host with no SSH — see
 * DeployController's docblock for why this exists at all. Token-gated,
 * not auth-gated, since it has to work before anyone's ever logged in on
 * a fresh deploy.
 */
class DeployControllerTest extends TestCase
{
    public function test_the_route_404s_when_no_token_is_configured(): void
    {
        config(['services.deploy.token' => null]);

        $this->get(route('deploy.migrate', ['token' => 'anything']))
            ->assertNotFound();
    }

    public function test_the_correct_token_runs_migrations(): void
    {
        config(['services.deploy.token' => 'a-real-secret-token']);

        $this->get(route('deploy.migrate', ['token' => 'a-real-secret-token']))
            ->assertOk();
    }

    public function test_the_wrong_token_is_forbidden(): void
    {
        config(['services.deploy.token' => 'a-real-secret-token']);

        $this->get(route('deploy.migrate', ['token' => 'a-guessed-token']))
            ->assertForbidden();
    }

    public function test_a_missing_token_is_forbidden(): void
    {
        config(['services.deploy.token' => 'a-real-secret-token']);

        $this->get(route('deploy.migrate'))
            ->assertForbidden();
    }
}
