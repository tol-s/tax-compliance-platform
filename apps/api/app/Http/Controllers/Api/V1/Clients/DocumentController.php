<?php

namespace App\Http\Controllers\Api\V1\Clients;

use App\Application\Audit\AuditLogger;
use App\Application\Documents\Actions\StoreDocument;
use App\Domain\Clients\Models\Client;
use App\Domain\Documents\Enums\DocumentKind;
use App\Domain\Documents\Models\Document;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Clients\StoreDocumentRequest;
use App\Http\Resources\V1\DocumentResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    public function index(Client $client): AnonymousResourceCollection
    {
        Gate::authorize('viewTaxProfile', $client);

        return DocumentResource::collection($client->documents()->with('creator')->latest()->get());
    }

    public function store(StoreDocumentRequest $request, Client $client, StoreDocument $store): JsonResponse
    {
        Gate::authorize('editTaxProfile', $client);

        $document = $store->handle(
            $client,
            $request->file('document'),
            DocumentKind::from($request->string('kind')->toString()),
            $request->input('issued_at'),
        );

        return (new DocumentResource($document->load('creator')))->response()->setStatusCode(201);
    }

    /** Files are only served through this authorised, audited endpoint. */
    public function download(Document $document, AuditLogger $audit): StreamedResponse
    {
        $client = $document->client()->firstOrFail();
        Gate::authorize('viewTaxProfile', $client);

        $audit->record('document.downloaded', $document, metadata: ['sha256' => $document->sha256], clientId: $client->getKey());

        return Storage::disk($document->disk)->download(
            $document->path,
            $document->original_name,
            ['Content-Type' => $document->mime_type, 'X-Content-Type-Options' => 'nosniff'],
        );
    }
}
