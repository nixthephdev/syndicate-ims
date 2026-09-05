<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('otp_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // OtpCode::PURPOSE_* — 'login' or 'checkout'. One code only ever
            // proves intent for the purpose it was issued for; a login code
            // can't be replayed to confirm a checkout.
            $table->string('purpose', 20);

            // sha256, not bcrypt — this is a short-lived, single-use,
            // rate-limited 6-digit code, not a password. Bcrypt's slowness
            // buys nothing extra here and just adds per-request cost.
            $table->string('code_hash');

            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'purpose']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('otp_codes');
    }
};
