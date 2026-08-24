<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();

            // Product::CATEGORY_* — apparel or skateboard (complete boards).
            // Individual skate parts live in skateboard_components.
            $table->string('category', 20)->index();

            // Money is ALWAYS integer centavos. PayMongo's API denominates in
            // centavos, so this avoids a conversion layer and float drift.
            // Variants may override this.
            $table->unsignedBigInteger('base_price_centavos');

            $table->string('image_path')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down()
    {
        Schema::dropIfExists('products');
    }
};
