<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The storefront landing page. Same standard as the admin pages: assert the
 * component Inertia actually resolves, not just a 200 — a renamed or moved
 * page component still returns 200 while rendering nothing.
 */
class StorefrontTest extends TestCase
{
    use RefreshDatabase;

    public function test_home_renders_the_storefront_for_guests(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Storefront/Home')
                ->where('auth.user', null)
            );
    }

    public function test_home_is_public_and_renders_for_signed_in_customers(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('home'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Storefront/Home')
                ->has('auth.user')
            );
    }

    /**
     * The boot splash is a loud brand element and must not leak into the admin,
     * which is deliberately a restrained management tool. app.blade.php gates it
     * on the Inertia component name, which is easy to break by renaming a page.
     */
    public function test_boot_splash_shows_on_customer_pages_only(): void
    {
        $this->get('/')->assertSee('app-splash', false);
        $this->get(route('login'))->assertSee('app-splash', false);

        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->get(route('admin.dashboard'))->assertDontSee('app-splash', false);
        $this->actingAs($admin)->get(route('dashboard'))->assertDontSee('app-splash', false);
    }
}
