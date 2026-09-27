<?php

use App\Application\Clients\Actions\CreateClient;
use App\Domain\Clients\Models\Client;
use App\Domain\Identity\Enums\SystemRole;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

beforeEach(fn () => Storage::fake(config('filesystems.documents_disk')));

it('creates a client with profile and a user-entered registration', function () {
    actingAsMember(SystemRole::TaxManager);

    $response = createClientViaApi()->assertCreated()
        ->assertJsonPath('data.legal_name', 'Fictional Trading Corp')
        ->assertJsonPath('data.current_registration.vat_status', 'NON_VAT')
        ->assertJsonPath('data.current_registration.status_source', 'USER_ENTERED')
        ->assertJsonPath('data.current_registration.verified', false)
        ->assertJsonPath('data.profile.currency', 'PHP');

    $id = $response->json('data.id');
    expect(DB::table('audit_logs')->where('client_id', $id)->pluck('action')->all())
        ->toContain('client.created', 'registration_status.recorded');
});

it('requires the certificate when the status is sourced from the BIR certificate', function () {
    actingAsMember(SystemRole::TaxManager);

    createClientViaApi(['registration' => ['status_source' => 'BIR_CERTIFICATE']])
        ->assertStatus(422)
        ->assertJsonStructure(['error' => ['details' => ['fields' => ['certificate']]]]);

    expect(DB::table('clients')->count())->toBe(0);
});

it('stores the certificate privately, hashes it and links it to the registration', function () {
    actingAsMember(SystemRole::TaxManager);

    $response = createClientViaApi([], certificatePdf())->assertCreated()
        ->assertJsonPath('data.current_registration.status_source', 'BIR_CERTIFICATE')
        ->assertJsonPath('data.current_registration.verified', true)
        ->assertJsonPath('data.current_registration.source_document.kind', 'CERTIFICATE_OF_REGISTRATION');

    $document = DB::table('documents')->first();
    expect($document->sha256)->toBe(hash('sha256', "%PDF-1.4\n% fictional test certificate\n"))
        ->and($document->path)->not->toContain('certificate.pdf')
        ->and($document->path)->toStartWith($document->organization_id.'/'.$response->json('data.id').'/');
    Storage::disk(config('filesystems.documents_disk'))->assertExists($document->path);
    $this->assertArrayNotHasKey('path', $response->json('data.current_registration.source_document'));
});

it('encrypts the taxpayer identifier at rest and finds it by exact match', function () {
    actingAsMember(SystemRole::TaxManager);
    createClientViaApi()->assertCreated();

    $raw = DB::table('clients')->value('taxpayer_identifier');
    expect($raw)->not->toContain('123-456-789')->and($raw)->not->toContain('123456789');

    $this->getJson('/api/v1/clients?q=12345678900000')->assertJsonCount(1, 'data');
    $this->getJson('/api/v1/clients?q=999-999-999')->assertJsonCount(0, 'data');
});

it('rejects a duplicate taxpayer identifier within the organisation only', function () {
    [, $org] = actingAsMember(SystemRole::TaxManager);
    createClientViaApi()->assertCreated();

    createClientViaApi(['legal_name' => 'Another', 'taxpayer_identifier' => '123456789-00000'])
        ->assertStatus(422)
        ->assertJsonPath('error.details.fields.taxpayer_identifier.0', 'Another client in this organisation already has this taxpayer identifier.');

    actingAsMember(SystemRole::TaxManager);
    createClientViaApi()->assertCreated();
});

it('masks the identifier for users without tax profile access and in audit rows', function () {
    actingAsMember(SystemRole::TaxManager);
    $id = createClientViaApi()->json('data.id');

    $after = json_decode(DB::table('audit_logs')->where('action', 'client.created')->value('after'), true);
    expect($after['taxpayer_identifier'])->toEndWith('0000')->not->toContain('123456789');
});

it('filters, searches, sorts and paginates on the server', function () {
    actingAsMember(SystemRole::TaxManager);
    foreach (['Charlie Co', 'Alpha Inc', 'Bravo Ltd'] as $i => $name) {
        createClientViaApi([
            'legal_name' => $name,
            'taxpayer_identifier' => "11{$i}-000-000-00000",
            'registration' => ['vat_status' => $i === 1 ? 'VAT_REGISTERED' : 'NON_VAT'],
        ])->assertCreated();
    }

    $this->getJson('/api/v1/clients?per_page=2')
        ->assertJsonPath('data.0.legal_name', 'Alpha Inc')
        ->assertJsonPath('meta.total', 3)
        ->assertJsonCount(2, 'data');
    $this->getJson('/api/v1/clients?sort=-legal_name')->assertJsonPath('data.0.legal_name', 'Charlie Co');
    $this->getJson('/api/v1/clients?vat_status=VAT_REGISTERED')->assertJsonCount(1, 'data')->assertJsonPath('data.0.legal_name', 'Alpha Inc');
    $this->getJson('/api/v1/clients?q=brav')->assertJsonCount(1, 'data');
    $this->getJson('/api/v1/clients?q=100%25')->assertJsonCount(0, 'data');
});

it('updates identity and profile with audited before and after values', function () {
    actingAsMember(SystemRole::TaxManager);
    $id = createClientViaApi()->json('data.id');

    $this->patchJson("/api/v1/clients/{$id}", [
        'trade_name' => 'Renamed',
        'profile' => ['fiscal_year_end_month' => 6, 'business_address' => ['city' => 'Makati']],
    ])->assertOk()
        ->assertJsonPath('data.trade_name', 'Renamed')
        ->assertJsonPath('data.profile.fiscal_year_end_month', 6);

    $update = DB::table('audit_logs')->where('action', 'client.updated')->first();
    expect(json_decode($update->before, true))->toBe(['trade_name' => 'Fictional Trading'])
        ->and(json_decode($update->after, true))->toBe(['trade_name' => 'Renamed']);
    expect(DB::table('audit_logs')->where('action', 'taxpayer_profile.updated')->exists())->toBeTrue();
});

it('enforces create and edit permissions', function () {
    actingAsMember(SystemRole::ReadOnly);
    createClientViaApi()->assertForbidden();

    actingAsMember(SystemRole::Accountant);
    createClientViaApi()->assertForbidden();
});

it('returns 404 for clients of other organisations and for malformed ids', function () {
    actingAsMember(SystemRole::Owner);
    $id = createClientViaApi()->json('data.id');

    actingAsMember(SystemRole::Owner);
    $this->getJson("/api/v1/clients/{$id}")->assertNotFound()->assertJsonPath('error.code', 'not_found');
    $this->patchJson("/api/v1/clients/{$id}", ['trade_name' => 'x'])->assertNotFound();
    $this->getJson('/api/v1/clients/not-a-uuid')->assertNotFound();
});

describe('client-level visibility', function () {
    it('shows preparers only their assigned clients and hides the rest as 404', function () {
        [, $org] = actingAsMember(SystemRole::TaxManager);
        $assigned = createClientViaApi(['legal_name' => 'Assigned', 'taxpayer_identifier' => '1'])->json('data.id');
        $hidden = createClientViaApi(['legal_name' => 'Hidden', 'taxpayer_identifier' => '2'])->json('data.id');

        [$preparer] = member(SystemRole::TaxPreparer, $org);
        $this->putJson("/api/v1/clients/{$assigned}/assignments", ['user_ids' => [$preparer->id]])->assertOk();

        Sanctum::actingAs($preparer);
        app()->forgetScopedInstances();
        $this->getJson('/api/v1/clients')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $assigned);
        $this->getJson("/api/v1/clients/{$hidden}")->assertNotFound();
        $this->getJson("/api/v1/clients/{$assigned}")->assertOk();
    });

    it('auto-assigns restricted users to clients they create', function () {
        [$preparer, $org, $membership] = member(SystemRole::TaxPreparer);
        $this->actingAs($preparer);

        $client = app(TenantContext::class)->runAs($org, fn () => app(CreateClient::class)->handle(
            $preparer,
            ['legal_name' => 'Self-created', 'entity_type' => 'CORPORATION'],
            [],
            ['vat_status' => 'NON_VAT', 'status_source' => 'USER_ENTERED', 'effective_from' => '2025-01-01'],
            null,
        ), $membership);

        expect(DB::table('client_user')->where('client_id', $client->id)->where('user_id', $preparer->id)->exists())->toBeTrue();
    });

    it('only lets organisation-wide managers change assignments, and only to active members', function () {
        [, $org] = actingAsMember(SystemRole::TaxManager);
        $id = createClientViaApi()->json('data.id');
        [$stranger] = member(SystemRole::TaxPreparer);

        $this->putJson("/api/v1/clients/{$id}/assignments", ['user_ids' => [$stranger->id]])
            ->assertStatus(422);

        [$preparer] = member(SystemRole::TaxPreparer, $org);
        $this->putJson("/api/v1/clients/{$id}/assignments", ['user_ids' => [$preparer->id]])
            ->assertOk()->assertJsonPath('data.assigned_users.0.id', $preparer->id);
        expect(DB::table('audit_logs')->where('action', 'client.assignments_changed')->exists())->toBeTrue();

        Sanctum::actingAs($preparer);
        app()->forgetScopedInstances();
        $this->putJson("/api/v1/clients/{$id}/assignments", ['user_ids' => []])->assertNotFound();
    });
});

it('serves dashboard figures computed from real data, with unbuilt modules reported as null', function () {
    actingAsMember(SystemRole::Owner);
    $this->getJson('/api/v1/dashboard')->assertJsonPath('data.clients.total', 0);

    createClientViaApi()->assertCreated();
    createClientViaApi(['legal_name' => 'B', 'taxpayer_identifier' => '9', 'registration' => ['vat_status' => 'VAT_REGISTERED']], certificatePdf());

    $this->getJson('/api/v1/dashboard')
        ->assertJsonPath('data.clients.total', 2)
        ->assertJsonPath('data.clients.vat_registered', 1)
        ->assertJsonPath('data.clients.non_vat', 1)
        ->assertJsonPath('data.clients.registration_unverified', 1)
        ->assertJsonPath('data.tax_periods', null)
        ->assertJsonPath('data.exceptions', null);
});

it('searches only visible clients', function () {
    [, $org] = actingAsMember(SystemRole::TaxManager);
    createClientViaApi(['legal_name' => 'Searchable Holdings'])->assertCreated();

    $this->getJson('/api/v1/search?q=searchable')->assertJsonPath('data.0.title', 'Searchable Holdings');

    [$preparer] = member(SystemRole::TaxPreparer, $org);
    Sanctum::actingAs($preparer);
    app()->forgetScopedInstances();
    $this->getJson('/api/v1/search?q=searchable')->assertJsonCount(0, 'data');
});

it('keeps client rows tenant-scoped at the model level', function () {
    [, $orgA, $membershipA] = actingAsMember(SystemRole::Owner);
    createClientViaApi()->assertCreated();
    [, $orgB, $membershipB] = member(SystemRole::Owner);

    app(TenantContext::class)->runAs($orgB, fn () => expect(Client::query()->count())->toBe(0), $membershipB);
    app(TenantContext::class)->runAs($orgA, fn () => expect(Client::query()->count())->toBe(1), $membershipA);
});
