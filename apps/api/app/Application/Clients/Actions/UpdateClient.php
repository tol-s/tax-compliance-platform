<?php

namespace App\Application\Clients\Actions;

use App\Application\Audit\AuditLogger;
use App\Domain\Clients\Models\Client;
use Illuminate\Support\Facades\DB;

/** Updates identity details and/or the taxpayer profile, auditing each changed attribute. */
class UpdateClient
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @param  array<string, mixed>  $client
     * @param  array<string, mixed>  $profile
     */
    public function handle(Client $model, array $client, array $profile): Client
    {
        return DB::transaction(function () use ($model, $client, $profile) {
            $before = ['taxpayer_identifier' => $model->maskedTaxpayerIdentifier()];
            $model->fill($client);
            $changes = $model->getDirty();
            $original = array_intersect_key($model->getOriginal(), $changes);

            if ($changes) {
                $model->save();
                $this->audit->record(
                    'client.updated',
                    $model,
                    before: $this->present($original, $before['taxpayer_identifier']),
                    after: $this->present($changes, $model->maskedTaxpayerIdentifier()),
                    clientId: $model->getKey(),
                );
            }

            $profileModel = $model->profile()->firstOrFail();
            $profileModel->fill($profile);
            $profileChanges = $profileModel->getDirty();

            if ($profileChanges) {
                $profileOriginal = array_intersect_key($profileModel->getOriginal(), $profileChanges);
                $profileModel->save();
                $this->audit->record(
                    'taxpayer_profile.updated',
                    $profileModel,
                    before: $this->normalise($profileOriginal),
                    after: $this->normalise(array_intersect_key($profileModel->getAttributes(), $profileChanges)),
                    clientId: $model->getKey(),
                );
            }

            return $model->refresh();
        });
    }

    /**
     * Identifiers are sensitive: audit rows record them masked.
     *
     * @param  array<string, mixed>  $values
     * @return array<string, mixed>
     */
    private function present(array $values, ?string $maskedIdentifier): array
    {
        unset($values['taxpayer_identifier_index'], $values['updated_at']);
        if (array_key_exists('taxpayer_identifier', $values)) {
            $values['taxpayer_identifier'] = $maskedIdentifier;
        }

        return $this->normalise($values);
    }

    /**
     * @param  array<string, mixed>  $values
     * @return array<string, mixed>
     */
    private function normalise(array $values): array
    {
        unset($values['updated_at']);

        return array_map(function ($value) {
            if ($value instanceof \BackedEnum) {
                return $value->value;
            }
            if ($value instanceof \DateTimeInterface) {
                return $value->format('Y-m-d');
            }
            if (is_string($value) && str_starts_with($value, '{')) {
                return json_decode($value, true) ?? $value;
            }

            return $value;
        }, $values);
    }
}
