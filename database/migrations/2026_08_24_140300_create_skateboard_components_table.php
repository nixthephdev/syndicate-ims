<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('skateboard_components', function (Blueprint $table) {
            $table->id();

            // SkateboardComponent::TYPE_* — deck, wheels, trucks, bolts.
            // No bearings and no swappable grip tape: the client's .glb files
            // contain no such meshes. See public/models/README.md.
            $table->string('type', 20)->index();

            $table->string('name');
            $table->string('slug')->unique();

            // The client shipped everything inside TWO .glb files, so a single
            // glb_path column cannot address a part. We need the file AND the
            // mesh name within it, which is how the reference loader
            // (reference/skate-demo/main.js) selects parts.
            $table->string('glb_file');   // 'board.glb' or 'wheels.glb'
            $table->string('mesh_name');  // e.g. 'syndicateRED', 'starBLUE'

            $table->unsignedBigInteger('price_centavos');
            $table->unsignedInteger('stock')->default(0);
            $table->unsignedInteger('low_stock_threshold')->default(5);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // A mesh appears once per file.
            $table->unique(['glb_file', 'mesh_name']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('skateboard_components');
    }
};
