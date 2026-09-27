<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // Nullable only for events that happen before a tenant is known (e.g. failed login).
            $table->foreignUuid('organization_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('actor_type', 32);
            $table->uuid('actor_id')->nullable();
            $table->string('action', 128);
            $table->string('entity_type', 128)->nullable();
            $table->uuid('entity_id')->nullable();
            $table->jsonb('before')->nullable();
            $table->jsonb('after')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->string('ip', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->uuid('correlation_id')->nullable()->index();
            $table->timestampTz('created_at')->useCurrent();

            $table->index(['organization_id', 'created_at']);
            $table->index(['entity_type', 'entity_id']);
            $table->index(['actor_type', 'actor_id']);
            $table->index('action');
        });

        // Append-only at the database level: application bugs or ad-hoc SQL through the
        // application role cannot rewrite audit history.
        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION audit_logs_block_mutation() RETURNS trigger AS $$
            BEGIN
                RAISE EXCEPTION 'audit_logs is append-only (% rejected)', TG_OP
                    USING ERRCODE = 'insufficient_privilege';
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER audit_logs_append_only
                BEFORE UPDATE OR DELETE ON audit_logs
                FOR EACH ROW EXECUTE FUNCTION audit_logs_block_mutation();

            CREATE TRIGGER audit_logs_no_truncate
                BEFORE TRUNCATE ON audit_logs
                FOR EACH STATEMENT EXECUTE FUNCTION audit_logs_block_mutation();
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
            DROP TRIGGER IF EXISTS audit_logs_no_truncate ON audit_logs;
            DROP TRIGGER IF EXISTS audit_logs_append_only ON audit_logs;
            DROP FUNCTION IF EXISTS audit_logs_block_mutation();
        SQL);
        Schema::dropIfExists('audit_logs');
    }
};
