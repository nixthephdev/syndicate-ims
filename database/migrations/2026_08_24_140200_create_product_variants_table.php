<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();

            $table->string('size', 20)->nullable();
            $table->string('color', 40)->nullable();
            $table->string('sku')->unique();

            // Null means "use the parent product's base_price_centavos".
            $table->unsignedBigInteger('price_centavos')->nullable();

            // THE stock column for apparel. Decremented only on confirmed
            // payment, inside a DB transaction. See DECISIONS.md.
            $table->unsignedInteger('stock')->default(0);

            // Objective 4: admin restock alert fires at or below this.
            $table->unsignedInteger('low_stock_threshold')->default(5);

            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // One variant per size+color combination per product.
            $table->unique(['product_id', 'size', 'color']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('product_variants');
    }
};
