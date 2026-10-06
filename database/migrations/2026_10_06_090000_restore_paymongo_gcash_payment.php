<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * GCash goes back through PayMongo, and the receipt-upload step goes away —
 * the client's call (2026-10-06): PayMongo confirms the payment, so there is
 * nothing for a customer to prove and nothing for staff to eyeball.
 *
 * Bank transfer goes with the receipts: it only ever worked BY receipt, and
 * PayMongo's flow here is GCash. Existing bank_transfer rows become gcash —
 * unpaid ones simply get a "Pay with GCash" button instead of an upload form.
 * Cash on pickup is untouched; staff still confirm that one in person.
 *
 * Uploaded receipt FILES are not deleted here (a migration has no business
 * touching storage) — storage/app/private-payment-proofs is just orphaned,
 * and the handover packager already empties it.
 */
return new class extends Migration
{
    public function up()
    {
        DB::table('orders')
            ->where('payment_method', 'bank_transfer')
            ->update(['payment_method' => 'gcash']);

        Schema::table('orders', function (Blueprint $table) {
            // Saved the moment a payment starts — returnFromCheckout() only
            // ever COMPARES the browser's id against this one.
            $table->string('paymongo_payment_intent_id')->nullable()->index()->after('paid_at');
            $table->string('paymongo_payment_id')->nullable()->after('paymongo_payment_intent_id');

            $table->dropColumn([
                'payment_proof_path',
                'payment_proof_uploaded_at',
                'payment_reference',
            ]);
        });
    }

    public function down()
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('payment_proof_path')->nullable();
            $table->timestamp('payment_proof_uploaded_at')->nullable();
            $table->string('payment_reference', 100)->nullable();

            $table->dropColumn(['paymongo_payment_intent_id', 'paymongo_payment_id']);
        });
    }
};
