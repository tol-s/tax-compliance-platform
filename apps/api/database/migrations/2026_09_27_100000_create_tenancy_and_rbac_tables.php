<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->char('country_code', 2)->default('PH');
            $table->char('base_currency', 3)->default('PHP');
            $table->boolean('is_demo')->default(false);
            $table->jsonb('settings')->default('{}');
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreign('current_organization_id')
                ->references('id')->on('organizations')->nullOnDelete();
        });

        Schema::create('permissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('key')->unique();
            $table->string('group');
            $table->string('description');
            $table->timestamps();
        });

        Schema::create('roles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // Null organization_id marks a platform-defined system role available to every tenant.
            $table->foreignUuid('organization_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('key');
            $table->string('name');
            $table->string('description')->nullable();
            $table->boolean('is_system')->default(false);
            $table->timestamps();

            $table->unique(['organization_id', 'key']);
        });
        // A plain unique index treats NULLs as distinct, so system role keys need their own guard.
        DB::statement('CREATE UNIQUE INDEX roles_system_key_unique ON roles (key) WHERE organization_id IS NULL');

        Schema::create('permission_role', function (Blueprint $table) {
            $table->foreignUuid('role_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('permission_id')->constrained()->cascadeOnDelete();
            $table->primary(['role_id', 'permission_id']);
        });

        Schema::create('organization_user', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('role_id')->constrained()->restrictOnDelete();
            $table->string('status')->default('ACTIVE')->index();
            $table->timestamps();

            $table->unique(['organization_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_user');
        Schema::dropIfExists('permission_role');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('permissions');
        Schema::table('users', fn (Blueprint $table) => $table->dropForeign(['current_organization_id']));
        Schema::dropIfExists('organizations');
    }
};
