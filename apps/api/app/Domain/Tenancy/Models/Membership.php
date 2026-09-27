<?php

namespace App\Domain\Tenancy\Models;

use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\Enums\MembershipStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

/** A user's membership of an organisation, carrying their role in that organisation. */
#[Table('organization_user')]
#[Fillable(['organization_id', 'user_id', 'role_id', 'status'])]
class Membership extends Pivot
{
    use HasUuids;

    public $incrementing = false;

    protected function casts(): array
    {
        return ['status' => MembershipStatus::class];
    }

    /** @return BelongsTo<Organization, $this> */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Role, $this> */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function isActive(): bool
    {
        return $this->status === MembershipStatus::Active;
    }
}
