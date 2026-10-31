<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The second half of a 50% deposit order, paid by GCash too (client,
 * 2026-10-31: "remove cash at pickup"). A deposit order now has two PayMongo
 * payments, so the balance gets its own intent/payment ids rather than
 * overwriting the deposit's — staff need both if a customer disputes one.
 *
 * balance_paid_at is separate from paid_at on purpose: paid_at is when the
 * order was secured (the deposit), and the sales report dates revenue by it.
 */
return new class extends Migration
{
    public function up()
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('balance_payment_intent_id')->nullable()->index()->after('paymongo_payment_id');
            $table->string('balance_payment_id')->nullable()->after('balance_payment_intent_id');
            $table->timestamp('balance_paid_at')->nullable()->after('balance_payment_id');
        });
    }

    public function down()
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['balance_payment_intent_id', 'balance_payment_id', 'balance_paid_at']);
        });
    }
};
