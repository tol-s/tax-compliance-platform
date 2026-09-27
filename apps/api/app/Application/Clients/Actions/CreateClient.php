<?php

namespace App\Application\Clients\Actions;

use App\Application\Audit\AuditLogger;
use App\Application\Clients\ClientAccess;
use App\Application\Documents\Actions\StoreDocument;
use App\Domain\Clients\Enums\ClientStatus;
use App\Domain\Clients\Enums\EntityType;
use App\Domain\Clients\Enums\StatusSource;
use App\Domain\Clients\Enums\VatStatus;
use App\Domain\Clients\Models\Client;
use App\Domain\Documents\Enums\DocumentKind;
use App\Domain\Identity\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Creates a taxpayer with its profile and initial registration status in one
 * transaction. If the certificate upload is part of the request, it is stored
 * first and removed again should the transaction fail.
 */
class CreateClient
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly StoreDocument $storeDocument,
        private readonly RecordRegistrationStatus $recordRegistration,
        private readonly ClientAccess $access,
    ) {}

    /**
     * @param  array{legal_name: string, trade_name?: ?string, taxpayer_identifier?: ?string, entity_type: string, industry?: ?string}  $client
     * @param  array<string, mixed>  $profile
     * @param  array{vat_status: string, status_source: string, effective_from: string, reason?: ?string}  $registration
     */
    public function handle(User $actor, array $client, array $profile, array $registration, ?UploadedFile $certificate): Client
    {
        $storedPaths = [];

        try {
            return DB::transaction(function () use ($actor, $client, $profile, $registration, $certificate, &$storedPaths) {
                $model = Client::query()->create([
                    ...$client,
                    'entity_type' => EntityType::from($client['entity_type']),
                    'status' => ClientStatus::Active,
                ]);
                $model->forceFill(['created_by' => $actor->getKey()])->saveQuietly();

                $model->profile()->create($profile);

                // Users who only see assigned clients are assigned to what they create.
                if (! $this->access->seesAllClients($actor)) {
                    $model->assignedUsers()->attach($actor->getKey(), ['organization_id' => $model->organization_id]);
                }

                $this->audit->record('client.created', $model, after: [
                    'legal_name' => $model->legal_name,
                    'trade_name' => $model->trade_name,
                    'taxpayer_identifier' => $model->maskedTaxpayerIdentifier(),
                    'entity_type' => $model->entity_type->value,
                ], clientId: $model->getKey());

                $document = null;
                if ($certificate) {
                    $document = $this->storeDocument->handle($model, $certificate, DocumentKind::CertificateOfRegistration);
                    $storedPaths[] = [$document->disk, $document->path];
                }

                $this->recordRegistration->handle(
                    $model,
                    VatStatus::from($registration['vat_status']),
                    StatusSource::from($registration['status_source']),
                    CarbonImmutable::parse($registration['effective_from']),
                    $registration['reason'] ?? null,
                    $document,
                    initial: true,
                );

                return $model;
            });
        } catch (Throwable $e) {
            foreach ($storedPaths as [$disk, $path]) {
                Storage::disk($disk)->delete($path);
            }
            throw $e;
        }
    }
}
