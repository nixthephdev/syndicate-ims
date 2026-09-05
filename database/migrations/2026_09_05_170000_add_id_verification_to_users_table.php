<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Manual buyer ID verification — a photo the customer uploads and a human
 * approves. No automation, no third-party KYC service.
 *
 * Columns on `users` rather than a separate history table, deliberately: a
 * government ID photo is a liability to hold, so this stores exactly ONE
 * current photo per person and replaces it (deleting the old file) on
 * resubmission. Keeping every rejected attempt would mean accumulating
 * copies of people's IDs for no operational benefit.
 */
return new class extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            // User::ID_STATUS_* — none / pending / approved / rejected.
            $table->string('id_verification_status', 20)
                ->default(User::ID_STATUS_NONE)
                ->after('is_active');

            $table->string('id_type', 40)->nullable()->after('id_verification_status');

            // A path on the PRIVATE 'local' disk (storage/app), never under
            // public/. Product images live in public/images/products and are
            // served directly by the web server; doing that with a
            // government ID would put it one guessed URL away from anyone.
            $table->string('id_photo_path')->nullable()->after('id_type');

            $table->timestamp('id_submitted_at')->nullable()->after('id_photo_path');
            $table->timestamp('id_reviewed_at')->nullable()->after('id_submitted_at');

            // Who approved/rejected it. nullOnDelete so removing a staff
            // account never deletes a customer's verification record.
            $table->foreignId('id_reviewed_by')
                ->nullable()
                ->after('id_reviewed_at')
                ->constrained('users')
                ->nullOnDelete();

            $table->text('id_rejection_reason')->nullable()->after('id_reviewed_by');

            // The admin queue filters on this.
            $table->index('id_verification_status');
        });

        // Everyone who already existed predates the requirement. Leaving them
        // at 'none' would retroactively lock every current customer — and
        // every seeded demo account the dashboard depends on — out of
        // checkout, for an ID nobody was ever asked for.
        DB::table('users')->update(['id_verification_status' => User::ID_STATUS_APPROVED]);
    }

    public function down()
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
};
