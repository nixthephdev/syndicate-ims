<?php

use App\Models\Order;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Payments move from a gateway to the way this shop actually takes money:
 * the customer sends GCash or a bank transfer, uploads the receipt, and
 * staff confirm it against their own account. PayMongo is gone entirely.
 *
 * `payment_method` becomes gcash / bank_transfer / cash. The old
 * `gcash_deposit` value disappears as a METHOD — "is this a 50% deposit?"
 * was never really a payment method, it is a consequence of choosing
 * delivery, and Order::requiresDeposit() derives it from
 * fulfillment_method instead. Existing gcash_deposit rows migrate to
 * 'gcash', which is what they actually were.
 *
 * The paymongo_* columns go with it. That does lose the gateway ids on a
 * handful of test orders, but they reference an integration that no longer
 * exists, so keeping them would just be three dead columns on every future
 * row. The orders themselves are untouched.
 */
return new class extends Migration
{
    public function up()
    {
        // Before the column changes: gcash_deposit was always a delivery
        // order paying its 50% by GCash.
        DB::table('orders')
            ->where('payment_method', 'gcash_deposit')
            ->update(['payment_method' => Order::PAYMENT_METHOD_GCASH]);

        Schema::table('orders', function (Blueprint $table) {
            // The uploaded receipt. A path on the PRIVATE 'local' disk, same
            // reasoning as ID photos — a payment screenshot carries names,
            // reference numbers and partial account details, and has no
            // business being fetchable by URL.
            $table->string('payment_proof_path')->nullable()->after('paid_at');
            $table->timestamp('payment_proof_uploaded_at')->nullable()->after('payment_proof_path');

            // What the customer says they sent it under — a GCash reference
            // number or a bank transaction ref. Optional and free text: it
            // is a hint to help staff find the payment, never a guarantee.
            $table->string('payment_reference', 100)->nullable()->after('payment_proof_uploaded_at');

            $table->dropColumn([
                'paymongo_payment_intent_id',
                'paymongo_source_id',
                'paymongo_payment_id',
            ]);
        });
    }

    public function down()
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('paymongo_payment_intent_id')->nullable();
            $table->string('paymongo_source_id')->nullable();
            $table->string('paymongo_payment_id')->nullable();

            $table->dropColumn([
                'payment_proof_path',
                'payment_proof_uploaded_at',
                'payment_reference',
            ]);
        });
    }
};
