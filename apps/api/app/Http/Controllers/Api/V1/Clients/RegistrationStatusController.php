<?php

namespace App\Http\Controllers\Api\V1\Clients;

use App\Application\Clients\Actions\RecordRegistrationStatus;
use App\Application\Documents\Actions\StoreDocument;
use App\Domain\Clients\Enums\StatusSource;
use App\Domain\Clients\Enums\VatStatus;
use App\Domain\Clients\Models\Client;
use App\Domain\Documents\Enums\DocumentKind;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Clients\ChangeRegistrationRequest;
use App\Http\Resources\V1\RegistrationStatusResource;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Throwable;

class RegistrationStatusController extends Controller
{
    public function index(Client $client): AnonymousResourceCollection
    {
        Gate::authorize('viewTaxProfile', $client);

        return RegistrationStatusResource::collection(
            $client->registrationStatuses()->with(['sourceDocument', 'creator'])->get()
        );
    }

    /** A formal, evidenced change of registered status. Administrator overrides need settings.manage. */
    public function store(ChangeRegistrationRequest $request, Client $client, StoreDocument $storeDocument, RecordRegistrationStatus $record): JsonResponse
    {
        Gate::authorize('editTaxProfile', $client);
        $source = StatusSource::from($request->string('status_source')->toString());
        if ($source === StatusSource::AdminOverride) {
            Gate::authorize('settings.manage');
        }

        $document = null;
        try {
            $status = DB::transaction(function () use ($request, $client, $storeDocument, $record, $source, &$document) {
                $document = $storeDocument->handle(
                    $client,
                    $request->file('document'),
                    $source->requiresCertificate() ? DocumentKind::CertificateOfRegistration : DocumentKind::RegistrationSupporting,
                );

                return $record->handle(
                    $client,
                    VatStatus::from($request->string('vat_status')->toString()),
                    $source,
                    CarbonImmutable::parse($request->string('effective_from')->toString()),
                    $request->string('reason')->toString(),
                    $document,
                );
            });
        } catch (Throwable $e) {
            if ($document) {
                Storage::disk($document->disk)->delete($document->path);
            }
            throw $e;
        }

        return (new RegistrationStatusResource($status->load(['sourceDocument', 'creator'])))
            ->response()->setStatusCode(201);
    }
}
