<?php

namespace Tests\Feature\Shop;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\Concerns\CompletesCheckoutOtp;
use Tests\Concerns\ConfirmsPayment;
use Tests\TestCase;

/**
 * The second half of a 50% deposit order, by GCash (client, 2026-10-31:
 * remove cash at pickup) — and the rule that a pickup order isn't handed
 * over until it's in.
 */
class BalancePaymentTest extends TestCase
{
    use CompletesCheckoutOtp;
    use ConfirmsPayment;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.paymongo.secret_key' => 'sk_test_fake']);
    }

    /** A ₱800 deposit order with its deposit paid — ₱400 balance left. */
    private function depositPaidOrder(User $user, string $fulfillment = Order::FULFILLMENT_PICKUP): Order
    {
        Mail::fake();

        $variant = ProductVariant::factory()->create([
            'product_id' => Product::factory()->create(['is_active' => true, 'base_price_centavos' => 80000])->id,
            'size' => 'M',
            'color' => 'Black',
            'stock' => 10,
            'price_centavos' => null,
            'is_active' => true,
        ]);

        $this->actingAs($user);
        $this->post(route('cart.store'), ['type' => 'variant', 'id' => $variant->id, 'quantity' => 1]);
        $this->post(route('checkout.store'), [
            'customer_name' => 'Juan Dela Cruz',
            'customer_email' => 'juan@example.test',
            'customer_phone' => '0917 123 4567',
            'fulfillment_method' => $fulfillment,
            'payment_option' => Order::PAYMENT_OPTION_DEPOSIT,
        ] + ($fulfillment === Order::FULFILLMENT_DELIVERY
            ? ['address_line' => 'Purok 1', 'barangay' => 'Tagas', 'city' => 'Daraga', 'province' => 'Albay']
            : []));
        $this->completeCheckoutOtp();

        return $this->markPaid(Order::firstOrFail());
    }

    private function fakePayMongo(string $status = 'succeeded'): void
    {
        Http::fake([
            'api.paymongo.com/v1/payment_intents/*/attach' => Http::response(['data' => ['id' => 'pi_bal', 'attributes' => [
                'status' => 'awaiting_next_action',
                'next_action' => ['redirect' => ['url' => 'https://pm.link/gcash-test']],
            ]]]),
            'api.paymongo.com/v1/payment_intents/pi_bal' => Http::response(['data' => ['id' => 'pi_bal', 'attributes' => [
                'status' => $status,
                'amount' => 40000,
                'payments' => [['id' => 'pay_bal']],
            ]]]),
            'api.paymongo.com/v1/payment_intents' => Http::response(['data' => ['id' => 'pi_bal', 'attributes' => [
                'client_key' => 'pi_bal_client',
                'status' => 'awaiting_payment_method',
            ]]]),
            'api.paymongo.com/v1/payment_methods' => Http::response(['data' => ['id' => 'pm_gcash']]),
        ]);
    }

    public function test_the_balance_is_charged_as_its_own_gcash_payment(): void
    {
        $user = User::factory()->create();
        $order = $this->depositPaidOrder($user);
        $this->fakePayMongo();

        $this->actingAs($user)->post(route('payment.balance.create', $order->order_number));

        Http::assertSent(fn ($request) => $request->url() === 'https://api.paymongo.com/v1/payment_intents'
            && $request['data']['attributes']['amount'] === 40000);
        $order->refresh();
        $this->assertSame('pi_bal', $order->balance_payment_intent_id);
        // The deposit's own intent is kept — staff need both.
        $this->assertNotSame('pi_bal', $order->paymongo_payment_intent_id);
        $this->assertSame(Order::STATUS_DEPOSIT_PAID, $order->status);
    }

    public function test_returning_from_a_paid_balance_settles_the_order_once_without_touching_stock(): void
    {
        $user = User::factory()->create();
        $order = $this->depositPaidOrder($user);
        $order->forceFill(['balance_payment_intent_id' => 'pi_bal'])->save();
        $stock = ProductVariant::firstOrFail()->stock;
        $this->fakePayMongo();

        $url = route('payment.balance.return', $order->order_number).'?payment_intent_id=pi_bal';
        $this->actingAs($user)->get($url)->assertRedirect(route('orders.show', $order->order_number));
        $this->get($url);

        $order->refresh();
        $this->assertSame(Order::STATUS_PAID, $order->status);
        $this->assertSame('pay_bal', $order->balance_payment_id);
        $this->assertNotNull($order->balance_paid_at);
        $this->assertSame($stock, ProductVariant::firstOrFail()->stock);
        // Paid once, so the customer heard about it once.
        $this->assertSame(1, $user->notifications()->where('data', 'like', '%Balance received%')->count());
    }

    public function test_a_mismatched_or_unpaid_intent_changes_nothing(): void
    {
        $user = User::factory()->create();
        $order = $this->depositPaidOrder($user);
        $order->forceFill(['balance_payment_intent_id' => 'pi_bal'])->save();

        $this->fakePayMongo('awaiting_payment_method');
        $this->actingAs($user)->get(route('payment.balance.return', $order->order_number).'?payment_intent_id=pi_bal')
            ->assertSessionHasErrors('payment');
        $this->get(route('payment.balance.return', $order->order_number).'?payment_intent_id=pi_someone_else');

        $this->assertSame(Order::STATUS_DEPOSIT_PAID, $order->fresh()->status);
    }

    public function test_only_the_owner_can_pay_and_only_while_a_balance_is_owed(): void
    {
        $owner = User::factory()->create();
        $order = $this->depositPaidOrder($owner);
        Http::fake();

        $this->actingAs(User::factory()->create())
            ->post(route('payment.balance.create', $order->order_number))
            ->assertForbidden();

        $order->forceFill(['status' => Order::STATUS_PAID])->save();
        $this->actingAs($owner)
            ->post(route('payment.balance.create', $order->order_number))
            ->assertSessionHasErrors('payment');

        Http::assertNothingSent();
    }

    /** No cash at pickup: the goods wait for the GCash balance. */
    public function test_a_pickup_order_cannot_be_handed_over_with_the_balance_unpaid(): void
    {
        $order = $this->depositPaidOrder(User::factory()->create());
        $order->forceFill(['fulfillment_stage' => Order::STAGE_READY])->save();
        $staff = User::factory()->staff()->create();

        $this->actingAs($staff)
            ->patch(route('admin.orders.fulfillment.update', $order->order_number), ['stage' => Order::STAGE_COMPLETED])
            ->assertSessionHasErrors('status');
        $this->actingAs($staff)
            ->patch(route('admin.orders.status.update', $order->order_number), ['status' => Order::STATUS_FULFILLED])
            ->assertSessionHasErrors('status');
        $this->assertSame(Order::STATUS_DEPOSIT_PAID, $order->fresh()->status);

        // Once the balance is in, it goes.
        $order->forceFill(['status' => Order::STATUS_PAID, 'balance_paid_at' => now()])->save();
        $this->actingAs($staff)
            ->patch(route('admin.orders.fulfillment.update', $order->order_number), ['stage' => Order::STAGE_COMPLETED])
            ->assertSessionHasNoErrors();
        $this->assertSame(Order::STATUS_FULFILLED, $order->fresh()->status);
    }

    /** Delivery keeps the client's original cash-on-delivery for the balance. */
    public function test_a_delivery_order_can_still_be_completed_with_cash_on_delivery(): void
    {
        $order = $this->depositPaidOrder(User::factory()->create(), Order::FULFILLMENT_DELIVERY);

        $this->actingAs(User::factory()->staff()->create())
            ->patch(route('admin.orders.status.update', $order->order_number), ['status' => Order::STATUS_FULFILLED])
            ->assertSessionHasNoErrors();

        $this->assertSame(Order::STATUS_FULFILLED, $order->fresh()->status);
    }
}
