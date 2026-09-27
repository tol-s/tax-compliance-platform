<?php

use App\Domain\Identity\Enums\SystemRole;
use Illuminate\Support\Facades\Storage;

beforeEach(fn () => Storage::fake(config('filesystems.documents_disk')));

it('returns a client\'s full audit trail with actor names, newest first', function () {
    [$user] = actingAsMember(SystemRole::TaxManager);
    $id = createClientViaApi()->json('data.id');
    $this->patchJson("/api/v1/clients/{$id}", ['industry' => 'Logistics'])->assertOk();

    $this->getJson("/api/v1/clients/{$id}/audit")
        ->assertOk()
        ->assertJsonPath('data.0.action', 'client.updated')
        ->assertJsonPath('data.0.actor.name', $user->name)
        ->assertJsonPath('meta.total', 3);
});

it('filters the organisation audit log and requires audit.view', function () {
    actingAsMember(SystemRole::TaxManager);
    createClientViaApi()->assertCreated();

    $this->getJson('/api/v1/audit?action=registration_status')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.action', 'registration_status.recorded');
    $this->getJson('/api/v1/audit?action=DROP TABLE')->assertStatus(422);

    actingAsMember(SystemRole::TaxPreparer);
    $this->getJson('/api/v1/audit')->assertForbidden();
});
