<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();

            // Nulled rather than cascaded on user deletion: admin transaction
            // history (objective 10) and sales reports (objective 8) must
            // survive a customer deleting their account. The customer_*
            // snapshot below is what keeps the record readable.
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            // Order::STATUS_* — pending, awaiting_payment, paid, cancelled,
            // failed, fulfilled.
            $table->string('status', 20)->default('pending')->index();

            $table->unsignedBigInteger('subtotal_centavos');
            $table->unsignedBigInteger('total_centavos');

            // PayMongo (test mode). Nullable: an order exists before checkout.
            $table->string('paymongo_payment_intent_id')->nullable()->index();
            $table->string('paymongo_source_id')->nullable();
            $table->string('paymongo_payment_id')->nullable();

            // Set by the webhook that confirms payment. This timestamp is the
            // moment stock is decremented. See DECISIONS.md.
            $table->timestamp('paid_at')->nullable()->index();

            // Snapshot so the order stays meaningful if the user is deleted.
            $table->string('customer_name');
            $table->string('customer_email');
            $table->string('customer_phone', 40)->nullable();

            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('orders');
    }
};
