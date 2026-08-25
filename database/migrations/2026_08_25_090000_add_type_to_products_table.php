<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Product::TYPE_* — the apparel subcategory (tee / hoodie / cap) shown on the
 * shop as browsable sections. Separate from `category`, which is the
 * apparel/skateboard split and stays as-is; `type` only makes sense within
 * apparel, so it is nullable rather than forcing skateboard products through
 * the same list.
 */
return new class extends Migration
{
    public function up()
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('type', 20)->nullable()->after('category')->index();
        });
    }

    public function down()
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }
};
