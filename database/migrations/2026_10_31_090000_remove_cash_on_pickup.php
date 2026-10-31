<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Cash on pickup is gone (client, 2026-10-31): every order pays by GCash,
 * either in full or as a 50% deposit — see Order::PAYMENT_OPTIONS.
 *
 * Only UNPAID cash orders move to gcash, so they get a "Pay with GCash"
 * button instead of being stranded with nobody left to confirm them. Cash
 * orders already paid, fulfilled or cancelled keep 'cash' — that is what
 * happened, and their history keeps saying so.
 *
 * No schema change: deposit_centavos already exists, and whether an order
 * is a deposit order is now read from it rather than from fulfillment_method.
 * Every existing delivery order has it set, so they read exactly as before.
 */
return new class extends Migration
{
    public function up()
    {
        DB::table('orders')
            ->where('payment_method', 'cash')
            ->where('status', 'awaiting_payment')
            ->update(['payment_method' => 'gcash']);
    }

    public function down()
    {
        // One-way: which gcash rows used to be cash is not recorded.
    }
};
