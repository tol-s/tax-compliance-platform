<?php

namespace App\Domain\Tenancy\Models;

use App\Domain\Identity\Models\User;
use Database\Factories\OrganizationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * The tenant: an accounting firm or organisation. Every tenant-owned record
 * carries organization_id and is filtered through TenantContext.
 */
#[Fillable(['name', 'slug', 'country_code', 'base_currency', 'is_demo', 'settings'])]
#[UseFactory(OrganizationFactory::class)]
class Organization extends Model
{
    /** @use HasFactory<OrganizationFactory> */
    use HasFactory, HasUuids;

    protected function casts(): array
    {
        return [
            'is_demo' => 'boolean',
            'settings' => 'array',
        ];
    }

    /** @return HasMany<Membership, $this> */
    public function memberships(): HasMany
    {
        return $this->hasMany(Membership::class);
    }

    /** @return BelongsToMany<User, $this> */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'organization_user')
            ->using(Membership::class)
            ->withPivot(['id', 'role_id', 'status'])
            ->withTimestamps();
    }
}
