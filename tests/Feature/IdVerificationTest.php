<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Manual buyer ID verification — customer uploads a photo, staff decide.
 *
 * The rules worth pinning are the ones a bug would quietly break: that a
 * customer cannot approve themselves, that the photo is not publicly
 * reachable, and that an unverified account genuinely cannot get an order
 * created (which means checking the OTP step too, not just the form).
 */
class IdVerificationTest extends TestCase
{
    use RefreshDatabase;

    private function photo(): UploadedFile
    {
        return UploadedFile::fake()->image('id.jpg', 800, 500);
    }

    private function submit(User $user, array $overrides = [])
    {
        return $this->actingAs($user)->post(route('verify-id.store'), array_merge([
            'id_type' => 'philsys',
            'photo' => $this->photo(),
        ], $overrides));
    }

    // ---------------------------------------------------------------- upload

    public function test_a_customer_can_submit_an_id_and_it_lands_pending(): void
    {
        Storage::fake('local');
        $user = User::factory()->unverifiedId()->create();

        $this->submit($user)->assertSessionHasNoErrors();

        $user->refresh();
        $this->assertSame(User::ID_STATUS_PENDING, $user->id_verification_status);
        $this->assertSame('philsys', $user->id_type);
        $this->assertNotNull($user->id_submitted_at);
        Storage::assertExists($user->id_photo_path);
    }

    /**
     * The photo must not land anywhere the web server will serve directly —
     * that is the one difference from every other image in this project.
     */
    public function test_the_photo_is_stored_privately_not_under_public(): void
    {
        Storage::fake('local');
        $user = User::factory()->unverifiedId()->create();

        $this->submit($user);

        $path = $user->fresh()->id_photo_path;
        $this->assertStringStartsWith('private-ids/', $path);
        $this->assertStringNotContainsString('public', $path);
        $this->assertFileDoesNotExist(public_path($path));
    }

    public function test_a_non_image_is_rejected(): void
    {
        Storage::fake('local');
        $user = User::factory()->unverifiedId()->create();

        $this->submit($user, ['photo' => UploadedFile::fake()->create('sneaky.php', 20)])
            ->assertSessionHasErrors('photo');

        $this->assertSame(User::ID_STATUS_NONE, $user->fresh()->id_verification_status);
    }

    public function test_an_unknown_id_type_is_rejected(): void
    {
        Storage::fake('local');
        $user = User::factory()->unverifiedId()->create();

        $this->submit($user, ['id_type' => 'made_up'])->assertSessionHasErrors('id_type');
    }

    /**
     * SECURITY. Same class of hole as a fillable `role`: if the verification
     * columns were mass-assignable, a customer could approve themselves and
     * the whole feature would be decorative.
     */
    public function test_a_customer_cannot_mass_assign_themselves_approved(): void
    {
        Storage::fake('local');
        $user = User::factory()->unverifiedId()->create();

        $this->submit($user, ['id_verification_status' => User::ID_STATUS_APPROVED]);

        $this->assertSame(User::ID_STATUS_PENDING, $user->fresh()->id_verification_status);
    }

    public function test_resubmitting_replaces_and_deletes_the_previous_photo(): void
    {
        Storage::fake('local');
        $user = User::factory()->unverifiedId()->create();

        $this->submit($user);
        $first = $user->fresh()->id_photo_path;

        $this->submit($user, ['id_type' => 'passport']);
        $second = $user->fresh()->id_photo_path;

        $this->assertNotSame($first, $second);
        Storage::assertMissing($first);
        Storage::assertExists($second);
    }

    public function test_an_approved_id_cannot_be_quietly_swapped(): void
    {
        Storage::fake('local');
        $user = User::factory()->create(); // approved by default

        $this->submit($user)->assertSessionHasErrors('id');

        $this->assertSame(User::ID_STATUS_APPROVED, $user->fresh()->id_verification_status);
    }

    // ----------------------------------------------------------- photo access

    public function test_only_the_owner_or_staff_can_view_a_photo(): void
    {
        Storage::fake('local');
        $owner = User::factory()->unverifiedId()->create();
        $this->submit($owner);

        $this->actingAs($owner)->get(route('verify-id.photo', $owner))->assertOk();

        $this->actingAs(User::factory()->staff()->create())
            ->get(route('verify-id.photo', $owner))->assertOk();

        // Another customer must not be able to read someone's ID.
        $this->actingAs(User::factory()->create())
            ->get(route('verify-id.photo', $owner))->assertForbidden();

        auth()->logout();
        $this->get(route('verify-id.photo', $owner))->assertRedirect(route('login'));
    }

    // ---------------------------------------------------------- staff review

    public function test_staff_can_approve_an_id(): void
    {
        Storage::fake('local');
        $customer = User::factory()->pendingId()->create();
        $staff = User::factory()->staff()->create();

        $this->actingAs($staff)->patch(
            route('admin.id-verifications.update', $customer),
            ['decision' => 'approve']
        )->assertSessionHasNoErrors();

        $customer->refresh();
        $this->assertSame(User::ID_STATUS_APPROVED, $customer->id_verification_status);
        $this->assertSame($staff->id, $customer->id_reviewed_by);
        $this->assertNotNull($customer->id_reviewed_at);
    }

    public function test_rejecting_requires_a_reason(): void
    {
        $customer = User::factory()->pendingId()->create();

        $this->actingAs(User::factory()->staff()->create())->patch(
            route('admin.id-verifications.update', $customer),
            ['decision' => 'reject']
        )->assertSessionHasErrors('reason');

        $this->assertSame(User::ID_STATUS_PENDING, $customer->fresh()->id_verification_status);
    }

    public function test_a_rejection_reason_reaches_the_customer(): void
    {
        $customer = User::factory()->pendingId()->create();

        $this->actingAs(User::factory()->staff()->create())->patch(
            route('admin.id-verifications.update', $customer),
            ['decision' => 'reject', 'reason' => 'The photo is cut off.']
        );

        $this->assertSame(User::ID_STATUS_REJECTED, $customer->fresh()->id_verification_status);

        // fresh() matters: actingAs() authenticates the instance it is
        // handed, and the one above still holds the pre-rejection values.
        $this->actingAs($customer->fresh())
            ->get(route('verify-id.create'))
            ->assertInertia(fn ($page) => $page
                ->component('Storefront/VerifyId')
                ->where('rejection_reason', 'The photo is cut off.')
            );
    }

    public function test_a_customer_cannot_review_ids(): void
    {
        $customer = User::factory()->pendingId()->create();

        $this->actingAs(User::factory()->create())
            ->patch(route('admin.id-verifications.update', $customer), ['decision' => 'approve'])
            ->assertForbidden();

        $this->actingAs(User::factory()->create())
            ->get(route('admin.id-verifications.index'))
            ->assertForbidden();

        $this->assertSame(User::ID_STATUS_PENDING, $customer->fresh()->id_verification_status);
    }

    // -------------------------------------------------------- checkout gating

    private function fillCart(User $user): void
    {
        $variant = ProductVariant::factory()->create([
            'product_id' => Product::factory()->create(['is_active' => true])->id,
            'stock' => 10,
            'is_active' => true,
        ]);

        $this->actingAs($user)->post(route('cart.store'), [
            'type' => 'variant',
            'id' => $variant->id,
            'quantity' => 1,
        ]);
    }

    /**
     * Verification no longer BLOCKS anything — a deliberate reversal. It
     * used to require staff approval before a first order, which meant a new
     * customer dead-ended until a human was at a keyboard. The ID is now
     * reviewed alongside the order instead, so ordering is never gated.
     */
    public function test_an_unverified_customer_can_still_reach_checkout(): void
    {
        $user = User::factory()->unverifiedId()->create();
        $this->fillCart($user);

        $this->actingAs($user)->get(route('checkout.create'))->assertOk();
    }

    public function test_an_unverified_customer_can_place_an_order(): void
    {
        $user = User::factory()->pendingId()->create();
        $this->fillCart($user);

        $this->actingAs($user)->post(route('checkout.store'), [
            'customer_name' => 'Juan Dela Cruz',
            'customer_email' => 'juan@example.test',
            'customer_phone' => '0917 123 4567',
        ])->assertRedirect(route('checkout.otp.create'));
    }

    public function test_a_verified_customer_reaches_checkout_normally(): void
    {
        $user = User::factory()->create(); // approved
        $this->fillCart($user);

        $this->actingAs($user)->get(route('checkout.create'))->assertOk();
    }

}
