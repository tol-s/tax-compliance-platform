<?php

use App\Domain\Identity\Enums\SystemRole;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

beforeEach(fn () => Storage::fake(config('filesystems.documents_disk')));

it('shows members without audit.view only their own actions on clients they can see', function () {
    [$manager, $organization] = actingAsMember(SystemRole::TaxManager);
    $client = createClientViaApi()->json('data.id');
    [$preparer] = member(SystemRole::TaxPreparer, $organization);
    $this->putJson("/api/v1/clients/{$client}/assignments", ['user_ids' => [$preparer->id]])->assertOk();

    $this->getJson('/api/v1/dashboard')
        ->assertOk()
        ->assertJsonPath('data.own_activity', null)
        ->assertJsonCount(3, 'data.recent_activity');

    Sanctum::actingAs($preparer);
    $this->patchJson("/api/v1/clients/{$client}", ['industry' => 'Logistics'])->assertOk();

    $this->getJson('/api/v1/dashboard')
        ->assertOk()
        ->assertJsonPath('data.recent_activity', null)
        ->assertJsonCount(1, 'data.own_activity')
        ->assertJsonPath('data.own_activity.0.action', 'client.updated');

    Sanctum::actingAs($manager);
    $this->putJson("/api/v1/clients/{$client}/assignments", ['user_ids' => []])->assertOk();

    Sanctum::actingAs($preparer);
    $this->getJson('/api/v1/dashboard')->assertOk()->assertJsonCount(0, 'data.own_activity');
});
