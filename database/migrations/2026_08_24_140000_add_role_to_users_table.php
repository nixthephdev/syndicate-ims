<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            // String rather than an enum: PHP 8.0 has no native enums, and a
            // DB enum makes adding a role a migration. Values are constrained
            // by User::ROLE_* constants and validation.
            $table->string('role', 20)->default('customer')->after('password')->index();
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['role']);
            $table->dropColumn('role');
        });
    }
};
