<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Objective 7: role-based access control.
 *
 * Routes are declared here rather than relying on real application routes, so
 * these tests keep verifying the middleware itself as the real routes change.
 */
class RoleMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Route::middleware(['web', 'auth', 'role:admin'])
            ->get('/_test/admin-only', fn () => 'admin area');

        Route::middleware(['web', 'auth', 'role:staff'])
            ->get('/_test/staff-only', fn () => 'staff area');
    }

    public function test_admin_reaches_admin_area(): void
    {
        $this->actingAs(User::factory()->admin()->create())
            ->get('/_test/admin-only')
            ->assertOk();
    }

    public function test_customer_is_forbidden_from_admin_area(): void
    {
        $this->actingAs(User::factory()->create())
            ->get('/_test/admin-only')
            ->assertForbidden();
    }

    public function test_staff_is_forbidden_from_admin_area(): void
    {
        $this->actingAs(User::factory()->staff()->create())
            ->get('/_test/admin-only')
            ->assertForbidden();
    }

    public function test_staff_reaches_staff_area(): void
    {
        $this->actingAs(User::factory()->staff()->create())
            ->get('/_test/staff-only')
            ->assertOk();
    }

    /** The hierarchy rule: an admin must satisfy a staff requirement. */
    public function test_admin_also_reaches_staff_area(): void
    {
        $this->actingAs(User::factory()->admin()->create())
            ->get('/_test/staff-only')
            ->assertOk();
    }

    public function test_customer_is_forbidden_from_staff_area(): void
    {
        $this->actingAs(User::factory()->create())
            ->get('/_test/staff-only')
            ->assertForbidden();
    }

    public function test_guests_are_redirected_to_login(): void
    {
        $this->get('/_test/admin-only')->assertRedirect('/login');
    }

    /** Fail closed: a role not in the hierarchy grants nothing. */
    public function test_an_unrecognised_role_grants_nothing(): void
    {
        $user = User::factory()->create();
        $user->role = 'wizard';
        $user->save();

        $this->actingAs($user)->get('/_test/staff-only')->assertForbidden();
    }
}
