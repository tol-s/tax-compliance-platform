<?php

namespace App\Domain\Clients\Models;

use App\Domain\Clients\Enums\ClientStatus;
use App\Domain\Clients\Enums\EntityType;
use App\Domain\Documents\Models\Document;
use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\Concerns\BelongsToOrganization;
use App\Support\Security\BlindIndex;
use Carbon\CarbonInterface;
use Database\Factories\ClientFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Validation\ValidationException;

/** A taxpayer managed by an organisation. */
#[Fillable(['legal_name', 'trade_name', 'taxpayer_identifier', 'entity_type', 'industry', 'status'])]
#[UseFactory(ClientFactory::class)]
class Client extends Model
{
    /** @use HasFactory<ClientFactory> */
    use BelongsToOrganization, HasFactory, HasUuids, SoftDeletes;

    protected function casts(): array
    {
        return [
            'taxpayer_identifier' => 'encrypted',
            'entity_type' => EntityType::class,
            'status' => ClientStatus::class,
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Client $client): void {
            if ($client->isDirty('taxpayer_identifier')) {
                $client->assertIdentifierIsUnique();
                $client->taxpayer_identifier_index = BlindIndex::taxpayerIdentifier($client->taxpayer_identifier);
            }
        });
    }

    /** @return HasOne<TaxpayerProfile, $this> */
    public function profile(): HasOne
    {
        return $this->hasOne(TaxpayerProfile::class);
    }

    /** @return HasMany<TaxRegistrationStatus, $this> */
    public function registrationStatuses(): HasMany
    {
        return $this->hasMany(TaxRegistrationStatus::class)->orderByDesc('effective_from');
    }

    /**
     * The open-ended (current) registration. The no-overlap exclusion constraint
     * guarantees at most one row per client has no effective_to.
     *
     * @return HasOne<TaxRegistrationStatus, $this>
     */
    public function currentRegistration(): HasOne
    {
        return $this->hasOne(TaxRegistrationStatus::class)->whereNull('effective_to');
    }

    /** @return HasMany<Document, $this> */
    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    /** @return BelongsToMany<User, $this> */
    public function assignedUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withPivot('organization_id')->withTimestamps();
    }

    /** The registration effective on a given date: what the tax engine will read. */
    public function registrationAsOf(CarbonInterface $date): ?TaxRegistrationStatus
    {
        $day = $date->toDateString();

        return $this->registrationStatuses()
            ->reorder()
            ->where('effective_from', '<=', $day)
            ->where(fn (Builder $q) => $q->whereNull('effective_to')->orWhere('effective_to', '>', $day))
            ->first();
    }

    /** @param Builder<Client> $query */
    public function scopeVisibleTo(Builder $query, User $user, bool $seesAllClients): void
    {
        if (! $seesAllClients) {
            $query->whereHas('assignedUsers', fn (Builder $q) => $q->whereKey($user->getKey()));
        }
    }

    /** Throws a field validation error if another client in this organisation has the same identifier. */
    public function assertIdentifierIsUnique(): void
    {
        $index = BlindIndex::taxpayerIdentifier($this->taxpayer_identifier);

        if ($index && static::withTrashed()->where('taxpayer_identifier_index', $index)
            ->when($this->exists, fn (Builder $q) => $q->whereKeyNot($this->getKey()))->exists()) {
            throw ValidationException::withMessages([
                'taxpayer_identifier' => 'Another client in this organisation already has this taxpayer identifier.',
            ]);
        }
    }

    public function maskedTaxpayerIdentifier(): ?string
    {
        $normalised = BlindIndex::normaliseIdentifier($this->taxpayer_identifier);

        return $normalised === null ? null : str_repeat('•', max(0, strlen($normalised) - 4)).substr($normalised, -4);
    }
}
