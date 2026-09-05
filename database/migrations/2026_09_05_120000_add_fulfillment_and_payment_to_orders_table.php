<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Client reopened "pickup + prepaid only" (2026-09-05): pickup orders may
 * now pay cash at pickup, and delivery orders require a 50% GCash deposit
 * upfront with the balance in cash on delivery. See Order model's docblock
 * and CLAUDE.md for the full flow.
 */
return new class extends Migration
{
    public function up()
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('fulfillment_method', 20)->default('pickup')->after('status');
            $table->string('payment_method', 20)->nullable()->after('fulfillment_method');
            $table->unsignedBigInteger('deposit_centavos')->nullable()->after('total_centavos');
        });
    }

    public function down()
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['fulfillment_method', 'payment_method', 'deposit_centavos']);
        });
    }
};
