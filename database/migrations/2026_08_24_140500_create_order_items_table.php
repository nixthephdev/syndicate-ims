<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();

            // Polymorphic: a line is either a ProductVariant (apparel) or a
            // SkateboardComponent (skate part). Both implement the same
            // stock contract, so the decrement logic treats them alike.
            $table->morphs('purchasable');

            // Snapshots. Prices and names change; an order must always show
            // what was actually bought at what price.
            $table->string('name_snapshot');
            $table->unsignedBigInteger('unit_price_centavos');
            $table->unsignedInteger('quantity');
            $table->unsignedBigInteger('line_total_centavos');

            // The 3D customizer's chosen configuration for this line
            // (objective 2) — which board mesh, which wheels, colours.
            $table->json('customization')->nullable();

            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('order_items');
    }
};
