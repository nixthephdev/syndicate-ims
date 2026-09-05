<?php

namespace Tests\Feature\Admin;

use App\Mail\OtpCodeMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => User::ROLE_ADMIN]);
    }

    public function test_staff_cannot_reach_user_management(): void
    {
        $staff = User::factory()->create(['role' => User::ROLE_STAFF]);

        $this->actingAs($staff)
            ->get(route('admin.users.index'))
            ->assertForbidden();
    }

    public function test_customer_cannot_reach_user_management(): void
    {
        $customer = User::factory()->create(['role' => User::ROLE_CUSTOMER]);

        $this->actingAs($customer)
            ->get(route('admin.users.index'))
            ->assertForbidden();
    }

    public function test_admin_sees_the_user_list(): void
    {
        User::factory()->count(3)->create();

        $this->actingAs($this->admin())
            ->get(route('admin.users.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Users/Index')
                // 3 factory users + the admin acting as viewer.
                ->has('users.data', 4)
            );
    }

    public function test_the_list_can_be_filtered_by_role(): void
    {
        User::factory()->create(['role' => User::ROLE_CUSTOMER, 'name' => 'A Customer']);
        User::factory()->create(['role' => User::ROLE_STAFF, 'name' => 'A Staffer']);

        $this->actingAs($this->admin())
            ->get(route('admin.users.index', ['role' => User::ROLE_STAFF]))
            ->assertInertia(fn ($page) => $page
                ->has('users.data', 1)
                ->where('users.data.0.name', 'A Staffer')
            );
    }

    public function test_the_list_can_be_searched_by_email(): void
    {
        User::factory()->create(['name' => 'Findme', 'email' => 'findme@example.test']);
        User::factory()->create(['name' => 'Someone Else', 'email' => 'else@example.test']);

        $this->actingAs($this->admin())
            ->get(route('admin.users.index', ['q' => 'findme']))
            ->assertInertia(fn ($page) => $page
                ->has('users.data', 1)
                ->where('users.data.0.name', 'Findme')
            );
    }

    public function test_admin_can_change_a_users_role(): void
    {
        $target = User::factory()->create(['role' => User::ROLE_CUSTOMER]);

        $this->actingAs($this->admin())
            ->patch(route('admin.users.role.update', $target), ['role' => User::ROLE_STAFF])
            ->assertRedirect();

        $this->assertSame(User::ROLE_STAFF, $target->fresh()->role);
    }

    public function test_an_invalid_role_is_rejected(): void
    {
        $target = User::factory()->create(['role' => User::ROLE_CUSTOMER]);

        $this->actingAs($this->admin())
            ->patch(route('admin.users.role.update', $target), ['role' => 'superadmin'])
            ->assertSessionHasErrors('role');

        $this->assertSame(User::ROLE_CUSTOMER, $target->fresh()->role);
    }

    public function test_admin_cannot_change_their_own_role(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->patch(route('admin.users.role.update', $admin), ['role' => User::ROLE_STAFF])
            ->assertSessionHasErrors('user');

        $this->assertSame(User::ROLE_ADMIN, $admin->fresh()->role);
    }

    public function test_admin_can_deactivate_and_reactivate_a_user(): void
    {
        $target = User::factory()->create(['is_active' => true]);

        $this->actingAs($this->admin())
            ->patch(route('admin.users.status.update', $target))
            ->assertRedirect();

        $this->assertFalse($target->fresh()->is_active);

        $this->actingAs($this->admin())
            ->patch(route('admin.users.status.update', $target))
            ->assertRedirect();

        $this->assertTrue($target->fresh()->is_active);
    }

    public function test_admin_cannot_deactivate_their_own_account(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->patch(route('admin.users.status.update', $admin))
            ->assertSessionHasErrors('user');

        $this->assertTrue($admin->fresh()->is_active);
    }

    public function test_a_deactivated_user_cannot_log_in(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('password'),
            'is_active' => false,
        ]);

        $this->post(route('login'), [
            'email' => $user->email,
            'password' => 'password',
        ])->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_an_active_user_can_still_log_in(): void
    {
        Mail::fake();
        $user = User::factory()->create([
            'password' => bcrypt('password'),
            'is_active' => true,
        ]);

        // The mirror of the deactivated case above: an ACTIVE account must
        // still get all the way in on its password alone.
        $this->post(route('login'), [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
    }
}
