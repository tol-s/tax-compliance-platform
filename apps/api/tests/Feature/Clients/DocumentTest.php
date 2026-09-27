<?php

use App\Domain\Identity\Enums\SystemRole;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake(config('filesystems.documents_disk'));
    [$this->user, $this->organization] = actingAsMember(SystemRole::TaxManager);
    $this->clientId = createClientViaApi()->json('data.id');
});

it('uploads, lists and downloads documents with an audit trail', function () {
    $id = $this->post("/api/v1/clients/{$this->clientId}/documents", [
        'document' => certificatePdf('evidence.pdf'),
        'kind' => 'REGISTRATION_SUPPORTING',
        'issued_at' => '2025-02-01',
    ], ['Accept' => 'application/json'])->assertCreated()->json('data.id');

    $this->getJson("/api/v1/clients/{$this->clientId}/documents")
        ->assertJsonPath('data.0.id', $id)
        ->assertJsonPath('data.0.original_name', 'evidence.pdf')
        ->assertJsonMissingPath('data.0.path');

    $download = $this->get("/api/v1/documents/{$id}/download");
    $download->assertOk();
    expect($download->streamedContent())->toContain('fictional test certificate');
    expect(DB::table('audit_logs')->where('action', 'document.downloaded')->where('entity_id', $id)->exists())->toBeTrue();
});

it('rejects executable and oversized uploads', function () {
    $this->post("/api/v1/clients/{$this->clientId}/documents", [
        'document' => UploadedFile::fake()->create('payload.php', 1, 'application/x-php'),
        'kind' => 'OTHER',
    ], ['Accept' => 'application/json'])->assertStatus(422);

    $this->post("/api/v1/clients/{$this->clientId}/documents", [
        'document' => UploadedFile::fake()->create('huge.pdf', 30_000, 'application/pdf'),
        'kind' => 'OTHER',
    ], ['Accept' => 'application/json'])->assertStatus(422);
});

it('does not serve another organisation\'s documents', function () {
    $id = $this->post("/api/v1/clients/{$this->clientId}/documents", [
        'document' => certificatePdf(), 'kind' => 'OTHER',
    ], ['Accept' => 'application/json'])->json('data.id');

    actingAsMember(SystemRole::Owner);
    $this->get("/api/v1/documents/{$id}/download", ['Accept' => 'application/json'])->assertNotFound();
});

it('explains when a recorded document has no stored file', function () {
    $id = $this->post("/api/v1/clients/{$this->clientId}/documents", [
        'document' => certificatePdf(), 'kind' => 'OTHER',
    ], ['Accept' => 'application/json'])->json('data.id');
    $path = DB::table('documents')->where('id', $id)->value('path');
    Storage::disk(config('filesystems.documents_disk'))->delete($path);

    $this->get("/api/v1/documents/{$id}/download", ['Accept' => 'application/json'])
        ->assertNotFound()
        ->assertJsonPath('error.code', 'document_file_unavailable');
});
