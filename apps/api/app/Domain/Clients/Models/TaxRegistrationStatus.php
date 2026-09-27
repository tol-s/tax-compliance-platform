<?php

namespace App\Domain\Clients\Models;

use App\Domain\Clients\Enums\StatusSource;
use App\Domain\Clients\Enums\VatStatus;
use App\Domain\Documents\Models\Document;
use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

/**
 * One effective-dated registration record. History is never rewritten: a
 * change closes the current row (sets effective_to once) and inserts a new
 * one. Nothing else about a row may change after it is written.
 */
#[Fillable([
    'client_id', 'vat_status', 'status_source', 'effective_from', 'effective_to',
    'source_document_id', 'last_verified_at', 'reason', 'created_by',
])]
class TaxRegistrationStatus extends Model
{
    use BelongsToOrganization, HasUuids;

    protected function casts(): array
    {
        return [
            'vat_status' => VatStatus::class,
            'status_source' => StatusSource::class,
            'effective_from' => 'date:Y-m-d',
            'effective_to' => 'date:Y-m-d',
            'last_verified_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function (TaxRegistrationStatus $status): void {
            $dirty = array_keys($status->getDirty());
            $closingOnly = $dirty === ['effective_to'] || $dirty === ['effective_to', 'updated_at'] || $dirty === ['updated_at', 'effective_to'];

            if (! $closingOnly || $status->getOriginal('effective_to') !== null) {
                throw new LogicException('Registration statuses are immutable; record a new status instead.');
            }
        });

        static::deleting(fn () => throw new LogicException('Registration statuses cannot be deleted.'));
    }

    /** @return BelongsTo<Client, $this> */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /** @return BelongsTo<Document, $this> */
    public function sourceDocument(): BelongsTo
    {
        return $this->belongsTo(Document::class, 'source_document_id');
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
