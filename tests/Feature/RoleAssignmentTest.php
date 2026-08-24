<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleAssignmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_registrations_default_to_customer(): void
    {
        $this->post('/register', [
            'name' => 'Juan Dela Cruz',
            'email' => 'juan@example.test',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertRedirect();

        $this->assertSame(
            User::ROLE_CUSTOMER,
            User::where('email', 'juan@example.test')->first()->role
        );
    }

    /**
     * SECURITY: 'role' is not in User::$fillable precisely so that this POST
     * cannot work. If this test ever fails, anyone can make themselves an
     * admin through the public registration form.
     */
    public function test_registration_cannot_self_assign_the_admin_role(): void
    {
        $this->post('/register', [
            'name' => 'Sneaky',
            'email' => 'sneaky@example.test',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => User::ROLE_ADMIN,
        ]);

        $user = User::where('email', 'sneaky@example.test')->first();

        $this->assertNotNull($user);
        $this->assertSame(User::ROLE_CUSTOMER, $user->role);
        $this->assertFalse($user->isAdmin());
    }

    public function test_role_helpers_reflect_the_hierarchy(): void
    {
        $customer = User::factory()->create();
        $staff = User::factory()->staff()->create();
        $admin = User::factory()->admin()->create();

        $this->assertTrue($customer->isCustomer());
        $this->assertFalse($customer->isStaff());
        $this->assertFalse($customer->isAdmin());

        $this->assertTrue($staff->isStaff());
        $this->assertFalse($staff->isAdmin());

        // Admins count as staff.
        $this->assertTrue($admin->isStaff());
        $this->assertTrue($admin->isAdmin());
    }
}
