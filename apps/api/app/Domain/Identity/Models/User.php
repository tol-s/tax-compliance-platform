<?php

namespace App\Domain\Identity\Models;

use App\Domain\Tenancy\Enums\MembershipStatus;
use App\Domain\Tenancy\Models\Membership;
use App\Domain\Tenancy\Models\Organization;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token', 'mfa_secret'])]
#[UseFactory(UserFactory::class)]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasUuids, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'mfa_enabled_at' => 'datetime',
            'last_login_at' => 'datetime',
            'mfa_secret' => 'encrypted',
            'password' => 'hashed',
        ];
    }

    /** @return HasMany<Membership, $this> */
    public function memberships(): HasMany
    {
        return $this->hasMany(Membership::class);
    }

    /** @return BelongsToMany<Organization, $this> */
    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class, 'organization_user')
            ->using(Membership::class)
            ->withPivot(['id', 'role_id', 'status'])
            ->withTimestamps();
    }

    /** @return BelongsTo<Organization, $this> */
    public function currentOrganization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'current_organization_id');
    }

    public function activeMembershipFor(string $organizationId): ?Membership
    {
        return $this->memberships()
            ->where('organization_id', $organizationId)
            ->where('status', MembershipStatus::Active)
            ->first();
    }
}
