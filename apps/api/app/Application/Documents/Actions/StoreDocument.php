<?php

namespace App\Application\Documents\Actions;

use App\Application\Audit\AuditLogger;
use App\Domain\Clients\Models\Client;
use App\Domain\Documents\Enums\DocumentKind;
use App\Domain\Documents\Models\Document;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

/**
 * Stores an uploaded file on the private documents disk under a random,
 * tenant-prefixed key and records its SHA-256. The original filename is kept
 * as metadata only and never used as a storage path.
 */
class StoreDocument
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function handle(Client $client, UploadedFile $file, DocumentKind $kind, ?string $issuedAt = null): Document
    {
        $disk = (string) config('filesystems.documents_disk');
        $extension = strtolower($file->guessExtension() ?: $file->getClientOriginalExtension() ?: 'bin');
        $path = sprintf('%s/%s/%s.%s', $client->organization_id, $client->getKey(), Str::uuid7(), $extension);

        $file->storeAs(dirname($path), basename($path), ['disk' => $disk]);

        $document = Document::query()->create([
            'client_id' => $client->getKey(),
            'kind' => $kind,
            'disk' => $disk,
            'path' => $path,
            'original_name' => mb_substr($file->getClientOriginalName(), 0, 255),
            'mime_type' => (string) $file->getMimeType(),
            'size' => (int) $file->getSize(),
            'sha256' => hash_file('sha256', $file->getRealPath()),
            'issued_at' => $issuedAt,
            'created_by' => Auth::id(),
        ]);

        $this->audit->record('document.uploaded', $document, after: [
            'kind' => $kind->value,
            'original_name' => $document->original_name,
            'size' => $document->size,
            'sha256' => $document->sha256,
        ], clientId: $client->getKey());

        return $document;
    }
}
