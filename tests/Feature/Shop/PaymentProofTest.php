<?php

namespace Tests\Feature\Shop;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Manual payment: the customer sends GCash or a bank transfer, uploads the
 * receipt, and STAFF confirm it against the shop's own account.
 *
 * The rule this file exists to defend: uploading a screenshot must never,
 * by itself, mark anything paid or move any stock. Anyone can attach any
 * image. If that ever stops being true, the shop gives goods away.
 */
class PaymentProofTest extends TestCase
{
    use RefreshDatabase;

    private function order(User $user, array $attributes = []): Order
    {
        $variant = ProductVariant::factory()->create([
            'product_id' => Product::factory()->create()->id,
            'stock' => 10,
            'is_active' => true,
        ]);

        $order = Order::create(array_merge([
            'order_number' => Order::generateOrderNumber(),
            'user_id' => $user->id,
            'status' => Order::STATUS_AWAITING_PAYMENT,
            'payment_method' => Order::PAYMENT_METHOD_GCASH,
            'subtotal_centavos' => 50000,
            'total_centavos' => 50000,
            'customer_name' => 'Juan Dela Cruz',
            'customer_email' => 'juan@example.test',
            'customer_phone' => '09171234567',
        ], $attributes));

        OrderItem::create([
            'order_id' => $order->id,
            'purchasable_type' => ProductVariant::class,
            'purchasable_id' => $variant->id,
            'name_snapshot' => 'Test Tee (M)',
            'unit_price_centavos' => 50000,
            'quantity' => 1,
            'line_total_centavos' => 50000,
        ]);

        return $order;
    }

    private function upload(User $user, Order $order, array $overrides = [])
    {
        return $this->actingAs($user)->post(
            route('payment.proof.store', $order->order_number),
            array_merge([
                'proof' => UploadedFile::fake()->image('receipt.jpg', 600, 900),
                'reference' => '0001234567890',
            ], $overrides)
        );
    }

    public function test_a_customer_can_upload_a_receipt(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $order = $this->order($user);

        $this->upload($user, $order)->assertSessionHasNoErrors();

        $order->refresh();
        $this->assertTrue($order->hasPaymentProof());
        $this->assertSame('0001234567890', $order->payment_reference);
        $this->assertNotNull($order->payment_proof_uploaded_at);
        Storage::assertExists($order->payment_proof_path);
    }

    /** THE rule. A screenshot is a claim; only staff confirming is payment. */
    public function test_uploading_a_receipt_does_not_mark_the_order_paid(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $order = $this->order($user);
        $variant = ProductVariant::firstOrFail();

        $this->upload($user, $order);

        $order->refresh();
        $this->assertSame(Order::STATUS_AWAITING_PAYMENT, $order->status);
        $this->assertNull($order->paid_at);
        $this->assertFalse($order->stockIsCommitted());
        $this->assertSame(10, $variant->fresh()->stock);
    }

    public function test_the_receipt_is_stored_privately_not_under_public(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $order = $this->order($user);

        $this->upload($user, $order);

        $path = $order->fresh()->payment_proof_path;
        $this->assertStringStartsWith('private-payment-proofs/', $path);
        $this->assertFileDoesNotExist(public_path($path));
    }

    public function test_only_the_owner_or_staff_can_view_a_receipt(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        $order = $this->order($owner);
        $this->upload($owner, $order);

        $this->actingAs($owner)
            ->get(route('payment.proof.show', $order->order_number))->assertOk();

        $this->actingAs(User::factory()->staff()->create())
            ->get(route('payment.proof.show', $order->order_number))->assertOk();

        $this->actingAs(User::factory()->create())
            ->get(route('payment.proof.show', $order->order_number))->assertForbidden();
    }

    public function test_a_customer_cannot_upload_against_someone_elses_order(): void
    {
        Storage::fake('local');
        $order = $this->order(User::factory()->create());

        $this->upload(User::factory()->create(), $order)->assertForbidden();

        $this->assertFalse($order->fresh()->hasPaymentProof());
    }

    public function test_a_cash_order_has_nothing_to_upload(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $order = $this->order($user, ['payment_method' => Order::PAYMENT_METHOD_CASH]);

        $this->upload($user, $order)->assertSessionHasErrors('payment');

        $this->assertFalse($order->fresh()->hasPaymentProof());
    }

    public function test_a_non_image_is_rejected(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $order = $this->order($user);

        $this->upload($user, $order, ['proof' => UploadedFile::fake()->create('x.php', 20)])
            ->assertSessionHasErrors('proof');
    }

    public function test_replacing_a_receipt_deletes_the_previous_one(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $order = $this->order($user);

        $this->upload($user, $order);
        $first = $order->fresh()->payment_proof_path;

        $this->upload($user, $order);
        $second = $order->fresh()->payment_proof_path;

        $this->assertNotSame($first, $second);
        Storage::assertMissing($first);
        Storage::assertExists($second);
    }

    public function test_a_confirmed_payment_cannot_be_re_proved(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $order = $this->order($user);

        $this->actingAs(User::factory()->staff()->create())
            ->patch(route('admin.orders.payment.confirm', $order->order_number));

        $this->assertSame(Order::STATUS_PAID, $order->fresh()->status);

        $this->upload($user, $order)->assertSessionHasErrors('payment');
    }

    /** The full journey, in the order a real customer walks it. */
    public function test_the_whole_flow_send_upload_confirm(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $order = $this->order($user);
        $variant = ProductVariant::firstOrFail();

        // 1. Customer uploads. Nothing moves.
        $this->upload($user, $order);
        $this->assertSame(10, $variant->fresh()->stock);

        // 2. Staff check their own account, then confirm. NOW it moves.
        $this->actingAs(User::factory()->staff()->create())
            ->patch(route('admin.orders.payment.confirm', $order->order_number))
            ->assertSessionHasNoErrors();

        $order->refresh();
        $this->assertSame(Order::STATUS_PAID, $order->status);
        $this->assertNotNull($order->paid_at);
        $this->assertSame(9, $variant->fresh()->stock);
    }
}
