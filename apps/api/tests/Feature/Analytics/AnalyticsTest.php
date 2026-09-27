<?php

use App\Domain\Identity\Enums\SystemRole;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

beforeEach(fn () => Storage::fake(config('filesystems.documents_disk')));

it('computes breakdowns and monthly series from real records', function () {
    actingAsMember(SystemRole::TaxManager);
    $vat = createClientViaApi([
        'entity_type' => 'CORPORATION',
        'industry' => 'Logistics',
        'registration' => ['vat_status' => 'VAT_REGISTERED', 'status_source' => 'BIR_CERTIFICATE'],
    ], certificatePdf())->json('data.id');
    createClientViaApi(['taxpayer_identifier' => '123-456-789-00001', 'entity_type' => 'PARTNERSHIP', 'industry' => 'Retail'])->assertCreated();

    $this->postJson("/api/v1/clients/{$vat}/registration-statuses", [
        'vat_status' => 'NON_VAT',
        'status_source' => 'BIR_CERTIFICATE',
        'effective_from' => '2026-01-01',
        'reason' => 'Deregistered from VAT; certificate attached.',
        'document' => certificatePdf('update.pdf'),
    ])->assertCreated();

    $response = $this->getJson('/api/v1/analytics')->assertOk();
    $month = now('Asia/Manila')->format('Y-m');

    $response
        ->assertJsonPath('data.scope', 'organization')
        ->assertJsonCount(12, 'data.months')
        ->assertJsonPath('data.months.11', $month)
        ->assertJsonPath('data.clients.total', 2)
        ->assertJsonPath('data.clients.by_vat_status', [
            ['key' => 'NON_VAT', 'label' => 'Non-VAT', 'count' => 2],
        ])
        ->assertJsonPath('data.clients.by_registration_source', [
            ['key' => 'BIR_CERTIFICATE', 'label' => 'BIR Certificate of Registration', 'count' => 1],
            ['key' => 'USER_ENTERED', 'label' => 'Entered by user', 'count' => 1],
        ])
        ->assertJsonPath('data.clients.added_by_month.11', 2)
        ->assertJsonPath('data.registrations.initial_by_month.11', 2)
        ->assertJsonPath('data.registrations.changes_by_month.11', 1)
        ->assertJsonPath('data.documents.total', 2)
        ->assertJsonPath('data.documents.uploaded_by_month.11', 2)
        ->assertJsonPath('data.activity.by_month.11.clients', 2)
        ->assertJsonPath('data.activity.by_month.11.registration', 3)
        ->assertJsonPath('data.activity.by_month.11.documents', 2);

    expect(collect($response->json('data.clients.by_entity_type'))->pluck('count', 'key')->all())
        ->toBe(['PARTNERSHIP' => 1, 'CORPORATION' => 1]);
});

it('limits preparers to assigned clients and hides activity and workload', function () {
    [$manager, $organization] = actingAsMember(SystemRole::TaxManager);
    $assigned = createClientViaApi()->json('data.id');
    createClientViaApi(['taxpayer_identifier' => '123-456-789-00001'])->assertCreated();

    [$preparer] = member(SystemRole::TaxPreparer, $organization);
    $this->putJson("/api/v1/clients/{$assigned}/assignments", ['user_ids' => [$preparer->id]])->assertOk();

    $this->getJson('/api/v1/analytics')
        ->assertOk()
        ->assertJsonPath('data.workload.0.name', $preparer->name)
        ->assertJsonPath('data.workload.0.assigned_clients', 1);

    Sanctum::actingAs($preparer);
    $this->getJson('/api/v1/analytics')
        ->assertOk()
        ->assertJsonPath('data.scope', 'assigned')
        ->assertJsonPath('data.clients.total', 1)
        ->assertJsonPath('data.workload', null)
        ->assertJsonPath('data.activity', null);
});

it('never counts another organisation\'s records', function () {
    actingAsMember(SystemRole::TaxManager);
    createClientViaApi()->assertCreated();

    actingAsMember(SystemRole::Owner);
    $this->getJson('/api/v1/analytics')
        ->assertOk()
        ->assertJsonPath('data.clients.total', 0)
        ->assertJsonPath('data.documents.total', 0)
        ->assertJsonPath('data.activity.by_month.11.clients', 0);
});
