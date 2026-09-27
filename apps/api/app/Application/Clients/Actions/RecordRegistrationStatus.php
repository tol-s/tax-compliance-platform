<?php

namespace App\Application\Clients\Actions;

use App\Application\Audit\AuditLogger;
use App\Domain\Clients\Enums\StatusSource;
use App\Domain\Clients\Enums\VatStatus;
use App\Domain\Clients\Exceptions\RegistrationRuleViolation;
use App\Domain\Clients\Models\Client;
use App\Domain\Clients\Models\TaxRegistrationStatus;
use App\Domain\Documents\Enums\DocumentKind;
use App\Domain\Documents\Models\Document;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * The only write path for a taxpayer's registered VAT status. It is called
 * by people (with a reason and evidence), never by calculation or threshold
 * code. History is preserved: the current record is closed on the new
 * effective date and a new record is inserted.
 */
class RecordRegistrationStatus
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function handle(
        Client $client,
        VatStatus $vatStatus,
        StatusSource $source,
        CarbonImmutable $effectiveFrom,
        ?string $reason,
        ?Document $document,
        bool $initial = false,
    ): TaxRegistrationStatus {
        if ($document && $document->client_id !== $client->getKey()) {
            throw RegistrationRuleViolation::on('document', 'The supporting document belongs to another client.');
        }

        if ($source->requiresCertificate() && $document?->kind !== DocumentKind::CertificateOfRegistration) {
            throw RegistrationRuleViolation::on('document', 'A status sourced from the BIR Certificate of Registration requires the certificate to be uploaded.');
        }

        return DB::transaction(function () use ($client, $vatStatus, $source, $effectiveFrom, $reason, $document, $initial) {
            /** @var TaxRegistrationStatus|null $current */
            $current = TaxRegistrationStatus::query()
                ->where('client_id', $client->getKey())
                ->whereNull('effective_to')
                ->lockForUpdate()
                ->first();

            if ($current) {
                if ($initial) {
                    throw RegistrationRuleViolation::on('vat_status', 'This client already has a registration status.');
                }
                if (blank($reason)) {
                    throw RegistrationRuleViolation::on('reason', 'Explain why the registration status is changing.');
                }
                if (! $document) {
                    throw RegistrationRuleViolation::on('document', 'Attach the supporting document for this change.');
                }
                if ($effectiveFrom->lessThanOrEqualTo($current->effective_from)) {
                    throw RegistrationRuleViolation::on(
                        'effective_from',
                        'The new status must take effect after the current one (from '.$current->effective_from->toDateString().'). Earlier history cannot be rewritten.'
                    );
                }

                $current->effective_to = $effectiveFrom->toDateString();
                $current->save();
            }

            $status = TaxRegistrationStatus::query()->create([
                'client_id' => $client->getKey(),
                'vat_status' => $vatStatus,
                'status_source' => $source,
                'effective_from' => $effectiveFrom->toDateString(),
                'source_document_id' => $document?->getKey(),
                'last_verified_at' => $document ? now() : null,
                'reason' => $reason,
                'created_by' => Auth::id(),
            ]);

            $this->audit->record(
                $current ? 'registration_status.changed' : 'registration_status.recorded',
                $status,
                before: $current ? [
                    'vat_status' => $current->vat_status->value,
                    'status_source' => $current->status_source->value,
                    'effective_from' => $current->effective_from->toDateString(),
                ] : [],
                after: [
                    'vat_status' => $vatStatus->value,
                    'status_source' => $source->value,
                    'effective_from' => $effectiveFrom->toDateString(),
                    'source_document_id' => $document?->getKey(),
                ],
                metadata: array_filter(['reason' => $reason]),
                clientId: $client->getKey(),
            );

            return $status;
        });
    }
}
