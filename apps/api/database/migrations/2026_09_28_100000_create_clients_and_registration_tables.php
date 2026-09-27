<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Needed for the exclusion constraint that forbids overlapping registration periods.
        DB::statement('CREATE EXTENSION IF NOT EXISTS btree_gist');

        Schema::table('roles', function (Blueprint $table) {
            // Roles without this flag only see clients they are assigned to.
            $table->boolean('sees_all_clients')->default(false);
        });

        Schema::create('clients', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->restrictOnDelete();
            $table->string('legal_name');
            $table->string('trade_name')->nullable();
            // Encrypted at rest; searched and de-duplicated through a keyed blind index.
            $table->text('taxpayer_identifier')->nullable();
            $table->char('taxpayer_identifier_index', 64)->nullable();
            $table->string('entity_type', 32);
            $table->string('industry')->nullable();
            $table->string('status', 16)->default('ACTIVE');
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'legal_name']);
            $table->unique(['organization_id', 'taxpayer_identifier_index']);
        });

        Schema::create('taxpayer_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('client_id')->unique()->constrained()->cascadeOnDelete();
            $table->char('jurisdiction_code', 2)->default('PH');
            $table->jsonb('business_address')->default('{}');
            $table->jsonb('registration_information')->default('{}');
            $table->date('registration_date')->nullable();
            $table->unsignedTinyInteger('fiscal_year_end_month')->default(12);
            $table->string('accounting_period', 16)->default('CALENDAR');
            $table->char('currency', 3)->default('PHP');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('organization_id');
        });

        Schema::create('documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('client_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('kind', 48);
            $table->string('disk', 32);
            $table->string('path');
            $table->string('original_name');
            $table->string('mime_type', 128);
            $table->unsignedBigInteger('size');
            $table->char('sha256', 64);
            $table->date('issued_at')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['organization_id', 'client_id', 'kind']);
        });

        Schema::create('tax_registration_statuses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('client_id')->constrained()->restrictOnDelete();
            $table->string('vat_status', 16);
            $table->string('status_source', 24);
            // Half-open range [effective_from, effective_to); null effective_to = open-ended.
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->foreignUuid('source_document_id')->nullable()->constrained('documents')->restrictOnDelete();
            $table->timestamp('last_verified_at')->nullable();
            $table->text('reason')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['client_id', 'effective_from']);
            $table->index('organization_id');
        });

        DB::statement("ALTER TABLE tax_registration_statuses ADD CONSTRAINT tax_registration_statuses_vat_status_check CHECK (vat_status IN ('VAT_REGISTERED', 'NON_VAT'))");
        DB::statement("ALTER TABLE tax_registration_statuses ADD CONSTRAINT tax_registration_statuses_source_check CHECK (status_source IN ('BIR_CERTIFICATE', 'USER_ENTERED', 'ADMIN_OVERRIDE'))");
        DB::statement('ALTER TABLE tax_registration_statuses ADD CONSTRAINT tax_registration_statuses_range_check CHECK (effective_to IS NULL OR effective_to > effective_from)');
        DB::statement(<<<'SQL'
            ALTER TABLE tax_registration_statuses
            ADD CONSTRAINT tax_registration_statuses_no_overlap
            EXCLUDE USING gist (client_id WITH =, daterange(effective_from, effective_to, '[)') WITH &&)
        SQL);

        Schema::create('client_user', function (Blueprint $table) {
            $table->foreignUuid('client_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->primary(['client_id', 'user_id']);
            $table->index(['organization_id', 'user_id']);
        });

        Schema::table('audit_logs', function (Blueprint $table) {
            // Lets a client's audit trail include events on its profile, registrations and documents.
            $table->uuid('client_id')->nullable()->after('entity_id');
            $table->index(['client_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', fn (Blueprint $table) => $table->dropColumn('client_id'));
        Schema::dropIfExists('client_user');
        Schema::dropIfExists('tax_registration_statuses');
        Schema::dropIfExists('documents');
        Schema::dropIfExists('taxpayer_profiles');
        Schema::dropIfExists('clients');
        Schema::table('roles', fn (Blueprint $table) => $table->dropColumn('sees_all_clients'));
    }
};
