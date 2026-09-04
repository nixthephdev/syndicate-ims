<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A Philippine delivery/pickup address for the order. Nullable throughout —
 * this shop is still pickup-first (see `notes`' own placeholder copy), so a
 * customer who's picking up at a branch has nothing to fill in here. No
 * `country` column: every branch and every customer this system has ever
 * seen is in the Philippines, so the address form itself is shaped for PH
 * addressing (barangay included) rather than a generic international one.
 */
return new class extends Migration
{
    public function up()
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('address_line')->nullable()->after('customer_phone');
            $table->string('barangay')->nullable()->after('address_line');
            $table->string('city')->nullable()->after('barangay');
            $table->string('province')->nullable()->after('city');
            $table->string('postal_code', 10)->nullable()->after('province');
        });
    }

    public function down()
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['address_line', 'barangay', 'city', 'province', 'postal_code']);
        });
    }
};
