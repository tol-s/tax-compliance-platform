<?php

use App\Domain\Clients\Enums\VatStatus;
use App\Domain\Clients\Models\Client;
use App\Domain\Clients\Models\TaxRegistrationStatus;
use App\Domain\Identity\Enums\SystemRole;
use App\Domain\Tenancy\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    Storage::fake(config('filesystems.documents_disk'));
    [$this->user, $this->organization, $this->membership] = actingAsMember(SystemRole::TaxManager);
    $this->clientId = createClientViaApi([], certificatePdf())->assertCreated()->json('data.id');
});

function changeStatus(string $clientId, array $overrides = []): TestResponse
{
    return test()->post("/api/v1/clients/{$clientId}/registration-statuses", array_replace([
        'vat_status' => 'VAT_REGISTERED',
        'status_source' => 'BIR_CERTIFICATE',
        'effective_from' => '2026-03-01',
        'reason' => 'Taxpayer registered for VAT; updated certificate received.',
        'document' => certificatePdf('updated-cor.pdf'),
    ], $overrides), ['Accept' => 'application/json']);
}

it('closes the current record and inserts a new one, preserving history', function () {
    changeStatus($this->clientId)->assertCreated()
        ->assertJsonPath('data.vat_status', 'VAT_REGISTERED')
        ->assertJsonPath('data.is_current', true)
        ->assertJsonPath('data.verified', true);

    $history = $this->getJson("/api/v1/clients/{$this->clientId}/registration-statuses")->assertOk()->json('data');
    expect($history)->toHaveCount(2)
        ->and($history[0]['vat_status'])->toBe('VAT_REGISTERED')
        ->and($history[0]['effective_to'])->toBeNull()
        ->and($history[1]['vat_status'])->toBe('NON_VAT')
        ->and($history[1]['effective_to'])->toBe('2026-03-01')
        ->and($history[1]['created_by']['name'])->toBe($this->user->name);
});

it('requires an effective date, a reason and a supporting document', function (string $field) {
    $payload = ['vat_status' => 'VAT_REGISTERED', 'status_source' => 'USER_ENTERED', 'effective_from' => '2026-03-01', 'reason' => 'A sufficiently long reason.', 'document' => certificatePdf()];
    unset($payload[$field]);

    $this->post("/api/v1/clients/{$this->clientId}/registration-statuses", $payload, ['Accept' => 'application/json'])
        ->assertStatus(422)
        ->assertJsonStructure(['error' => ['details' => ['fields' => [$field]]]]);

    expect(TaxRegistrationStatus::withoutGlobalScopes()->count())->toBe(1);
})->with(['effective_from', 'reason', 'document']);

it('refuses to rewrite history before the current record', function () {
    changeStatus($this->clientId, ['effective_from' => '2024-06-01'])
        ->assertStatus(422)
        ->assertJsonStructure(['error' => ['details' => ['fields' => ['effective_from']]]]);
    changeStatus($this->clientId, ['effective_from' => '2025-01-01'])->assertStatus(422);
});

it('writes a before/after audit event with the reason', function () {
    changeStatus($this->clientId)->assertCreated();

    $event = DB::table('audit_logs')->where('action', 'registration_status.changed')->first();
    expect($event->client_id)->toBe($this->clientId)
        ->and(json_decode($event->before, true))->toMatchArray(['vat_status' => 'NON_VAT', 'status_source' => 'BIR_CERTIFICATE'])
        ->and(json_decode($event->after, true))->toMatchArray(['vat_status' => 'VAT_REGISTERED', 'effective_from' => '2026-03-01'])
        ->and(json_decode($event->metadata, true)['reason'])->toContain('updated certificate');
});

it('needs tax_profile.edit to change status', function () {
    [$preparer] = member(SystemRole::TaxPreparer, $this->organization);
    DB::table('client_user')->insert(['client_id' => $this->clientId, 'user_id' => $preparer->id, 'organization_id' => $this->organization->id, 'created_at' => now(), 'updated_at' => now()]);
    Sanctum::actingAs($preparer);

    changeStatus($this->clientId)->assertForbidden();
});

it('reserves administrator overrides for settings managers', function () {
    changeStatus($this->clientId, ['status_source' => 'ADMIN_OVERRIDE'])->assertForbidden();

    [$admin] = member(SystemRole::Admin, $this->organization);
    Sanctum::actingAs($admin);
    changeStatus($this->clientId, ['status_source' => 'ADMIN_OVERRIDE'])->assertCreated()
        ->assertJsonPath('data.status_source', 'ADMIN_OVERRIDE');
});

it('resolves the registration effective on any date (what the tax engine will read)', function () {
    changeStatus($this->clientId)->assertCreated();

    app(TenantContext::class)->runAs($this->organization, function () {
        $client = Client::query()->findOrFail($this->clientId);
        expect($client->registrationAsOf(CarbonImmutable::parse('2024-12-31')))->toBeNull()
            ->and($client->registrationAsOf(CarbonImmutable::parse('2025-01-01'))->vat_status)->toBe(VatStatus::NonVat)
            ->and($client->registrationAsOf(CarbonImmutable::parse('2026-02-28'))->vat_status)->toBe(VatStatus::NonVat)
            ->and($client->registrationAsOf(CarbonImmutable::parse('2026-03-01'))->vat_status)->toBe(VatStatus::VatRegistered);
    }, $this->membership);
});

it('treats registration rows as immutable', function () {
    app(TenantContext::class)->runAs($this->organization, function () {
        $status = TaxRegistrationStatus::query()->firstOrFail();
        expect(fn () => $status->update(['vat_status' => VatStatus::VatRegistered]))->toThrow(LogicException::class)
            ->and(fn () => $status->delete())->toThrow(LogicException::class);
    }, $this->membership);
});

it('makes overlapping registration periods impossible at the database level', function () {
    $existing = DB::table('tax_registration_statuses')->first();

    expect(fn () => DB::table('tax_registration_statuses')->insert([
        'id' => (string) Str::uuid7(),
        'organization_id' => $existing->organization_id,
        'client_id' => $existing->client_id,
        'vat_status' => 'VAT_REGISTERED',
        'status_source' => 'USER_ENTERED',
        'effective_from' => '2025-06-01',
        'created_at' => now(), 'updated_at' => now(),
    ]))->toThrow(QueryException::class, 'tax_registration_statuses_no_overlap');
});

it('does not change registration status when the client record is edited', function () {
    $this->patchJson("/api/v1/clients/{$this->clientId}", ['industry' => 'Manufacturing'])->assertOk();

    expect(DB::table('tax_registration_statuses')->count())->toBe(1)
        ->and(DB::table('tax_registration_statuses')->value('vat_status'))->toBe('NON_VAT');
});
