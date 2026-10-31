<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Buyer ID verification removed (client, 2026-10-31): the GCash payment
 * already identifies the buyer, so a separate government-ID photo added
 * friction and a liability for nothing.
 *
 * Uploaded photo FILES are not deleted here (a migration has no business
 * touching storage) — storage/app/private-ids is orphaned and should be
 * emptied by hand; the handover packager already never ships it.
 */
return new class extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['id_reviewed_by']);
            $table->dropIndex(['id_verification_status']);
            $table->dropColumn([
                'id_verification_status',
                'id_type',
                'id_photo_path',
                'id_submitted_at',
                'id_reviewed_at',
                'id_reviewed_by',
                'id_rejection_reason',
            ]);
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('id_verification_status', 20)->default('none')->after('is_active');
            $table->string('id_type', 40)->nullable()->after('id_verification_status');
            $table->string('id_photo_path')->nullable()->after('id_type');
            $table->timestamp('id_submitted_at')->nullable()->after('id_photo_path');
            $table->timestamp('id_reviewed_at')->nullable()->after('id_submitted_at');
            $table->foreignId('id_reviewed_by')->nullable()->after('id_reviewed_at')
                ->constrained('users')->nullOnDelete();
            $table->text('id_rejection_reason')->nullable()->after('id_reviewed_by');
            $table->index('id_verification_status');
        });
    }
};
