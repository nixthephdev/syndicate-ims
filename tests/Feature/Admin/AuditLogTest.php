<?php

namespace Tests\Feature\Admin;

use App\Models\AuditLog;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The admin's view of what staff did (client, 2026-10-31). What matters is
 * that the actions worth checking on actually land in the log, with enough
 * detail to read without opening anything — and that only an admin reads it.
 */
class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    private function variant(int $stock = 40): ProductVariant
    {
        return ProductVariant::factory()->create([
            'product_id' => Product::factory()->create(['name' => 'Box Logo Tee'])->id,
            'size' => 'M',
            'color' => 'Black',
            'sku' => 'BLT-M-BLK',
            'stock' => $stock,
            'low_stock_threshold' => 5,
        ]);
    }

    /** The headline case: someone quietly changing a stock count. */
    public function test_a_stock_edit_is_logged_with_who_and_the_before_and_after(): void
    {
        $staff = User::factory()->staff()->create(['name' => 'Pat Staff']);
        $variant = $this->variant(40);

        $this->actingAs($staff)->patch(route('admin.products.variants.update', [$variant->product_id, $variant->id]), [
            'size' => 'M',
            'color' => 'Black',
            'sku' => 'BLT-M-BLK',
            'stock' => 4,
            'low_stock_threshold' => 5,
            'is_active' => true,
        ])->assertSessionHasNoErrors();

        $log = AuditLog::query()->where('action', AuditLog::ACTION_VARIANT_UPDATED)->sole();

        $this->assertSame($staff->id, $log->user_id);
        $this->assertSame('Pat Staff', $log->actor_name);
        $this->assertSame('staff', $log->actor_role);
        $this->assertSame([40, 4], $log->changes['stock']);
        $this->assertStringContainsString('from 40 to 4', $log->description);
        $this->assertSame('Box Logo Tee (M / Black)', $log->subject_label);
    }

    /** Saving a form without changing anything isn't activity. */
    public function test_saving_without_changes_logs_nothing(): void
    {
        $variant = $this->variant(40);

        $this->actingAs(User::factory()->staff()->create())
            ->patch(route('admin.products.variants.update', [$variant->product_id, $variant->id]), [
                'size' => 'M',
                'color' => 'Black',
                'sku' => 'BLT-M-BLK',
                'stock' => 40,
                'low_stock_threshold' => 5,
                'is_active' => true,
            ]);

        $this->assertSame(0, AuditLog::query()->where('action', AuditLog::ACTION_VARIANT_UPDATED)->count());
    }

    public function test_order_actions_and_role_changes_are_logged(): void
    {
        $admin = User::factory()->admin()->create();
        $customer = User::factory()->create();
        $order = Order::factory()->create(['status' => Order::STATUS_AWAITING_PAYMENT, 'user_id' => $customer->id]);

        $this->actingAs($admin)->patch(route('admin.orders.status.update', $order->order_number), ['status' => 'cancelled']);
        $this->actingAs($admin)->patch(route('admin.users.role.update', $customer), ['role' => 'staff']);

        $this->assertSame(1, AuditLog::query()->where('action', AuditLog::ACTION_ORDER_CANCELLED)->count());
        $this->assertSame(['customer', 'staff'], AuditLog::query()->where('action', AuditLog::ACTION_USER_ROLE)->sole()->changes['role']);
    }

    /** Staff sign-ins and failed attempts on staff accounts; shoppers' aren't. */
    public function test_staff_sign_ins_and_failed_attempts_are_logged_but_customers_are_not(): void
    {
        $staff = User::factory()->staff()->create(['email' => 'pat@syndicate.test']);
        $customer = User::factory()->create(['email' => 'shopper@example.test']);

        $this->post(route('login'), ['email' => 'pat@syndicate.test', 'password' => 'wrong-password']);
        $this->post(route('login'), ['email' => 'pat@syndicate.test', 'password' => 'password']);
        $this->post(route('logout'));
        $this->post(route('login'), ['email' => 'shopper@example.test', 'password' => 'password']);

        $this->assertSame(
            [AuditLog::ACTION_LOGIN_FAILED, AuditLog::ACTION_LOGIN, AuditLog::ACTION_LOGOUT],
            AuditLog::query()->orderBy('id')->pluck('action')->all()
        );
        $this->assertSame(0, AuditLog::query()->where('user_id', $customer->id)->count());
    }

    public function test_only_admins_can_read_the_log(): void
    {
        $this->actingAs(User::factory()->staff()->create())
            ->get(route('admin.audit-log.index'))
            ->assertForbidden();

        $this->actingAs(User::factory()->staff()->create())
            ->get(route('admin.audit-log.export'))
            ->assertForbidden();
    }

    public function test_the_log_page_filters_by_activity_and_the_export_is_itself_logged(): void
    {
        $admin = User::factory()->admin()->create();
        AuditLog::record(AuditLog::ACTION_PRODUCT_CREATED, 'Created product X.', null, null, null, $admin);
        AuditLog::record(AuditLog::ACTION_VARIANT_UPDATED, 'Changed stock of Y from 9 to 1.', null, null, null, $admin);

        $this->actingAs($admin)
            ->get(route('admin.audit-log.index', ['group' => 'variant']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/AuditLog/Index')
                ->has('logs.data', 1)
                ->where('logs.data.0.action', AuditLog::ACTION_VARIANT_UPDATED)
            );

        $csv = $this->actingAs($admin)->get(route('admin.audit-log.export'));
        $csv->assertOk();
        $this->assertStringContainsString('Changed stock of Y from 9 to 1.', $csv->getContent());
        $this->assertSame(1, AuditLog::query()->where('action', AuditLog::ACTION_EXPORT)->count());
    }
}
