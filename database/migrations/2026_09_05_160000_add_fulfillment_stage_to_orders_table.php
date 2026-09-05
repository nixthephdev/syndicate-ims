<?php

use App\Models\Order;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Order tracking that is separate from payment state.
 *
 * `status` answers "has the money arrived?" — awaiting_payment, deposit_paid,
 * paid. `fulfillment_stage` answers "where is my order?" — preparing, ready,
 * out for delivery. They are genuinely independent axes and CANNOT share one
 * column: a delivery order sits at `deposit_paid` for its whole journey
 * (50% up front, the balance in cash on delivery), so a stage written into
 * `status` would erase the fact that a balance is still owed — and
 * DashboardController's COLLECTED_AMOUNT_SQL keys off `status = 'deposit_paid'`
 * to count only the deposit as collected revenue, so overwriting it would
 * silently overstate takings. Two axes, two columns.
 */
return new class extends Migration
{
    public function up()
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('fulfillment_stage', 20)
                ->default(Order::STAGE_NOT_STARTED)
                ->after('fulfillment_method');

            // The admin order queue filters on this, same as it does status.
            $table->index('fulfillment_stage');
        });

        // Orders already marked fulfilled finished their journey before this
        // column existed — backfill rather than leaving them at not_started,
        // which would read as "we haven't touched it yet" for completed work.
        DB::table('orders')
            ->where('status', Order::STATUS_FULFILLED)
            ->update(['fulfillment_stage' => Order::STAGE_COMPLETED]);
    }

    public function down()
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['fulfillment_stage']);
            $table->dropColumn('fulfillment_stage');
        });
    }
};
