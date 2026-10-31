<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Who did what in the admin panel, and when — the admin's way of checking
 * that staff aren't doing anything suspicious (client, 2026-10-31).
 *
 * Append-only by design: nothing in the app updates or deletes a row, and
 * there is no updated_at. A log someone can edit proves nothing.
 *
 * The actor's name and role, and the subject's label, are SNAPSHOTS, same
 * reasoning as OrderItem's name_snapshot: the log has to keep reading
 * correctly after a staff account is renamed or a product is archived.
 */
return new class extends Migration
{
    public function up()
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            // nullOnDelete: removing an account must never erase what it did.
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('actor_name')->nullable();
            $table->string('actor_role', 20)->nullable();
            // AuditLog::ACTION_* — e.g. variant.updated, order.cancelled.
            $table->string('action', 50)->index();
            $table->string('description', 500);
            $table->nullableMorphs('subject');
            $table->string('subject_label')->nullable();
            // { field: [old, new] } for edits, so "stock 40 -> 4" is visible.
            $table->json('changes')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
        });
    }

    public function down()
    {
        Schema::dropIfExists('audit_logs');
    }
};
