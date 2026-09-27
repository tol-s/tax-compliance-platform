<?php

namespace App\Application\Identity\Actions;

use App\Application\Audit\AuditLogger;
use App\Domain\Identity\Enums\SystemRole;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\Enums\MembershipStatus;
use App\Domain\Tenancy\Models\Membership;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Changes a member's role or status. Guards: nobody edits their own
 * membership, only owners touch owner memberships, and an organisation always
 * keeps at least one active owner.
 */
class UpdateMember
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly TenantContext $tenant,
    ) {}

    public function handle(User $actor, Membership $membership, ?SystemRole $role, ?MembershipStatus $status): Membership
    {
        if ($membership->organization_id !== $this->tenant->organizationId()) {
            throw new AuthorizationException;
        }
        if ($membership->user_id === $actor->getKey()) {
            throw ValidationException::withMessages(['membership' => 'You cannot change your own role or status.']);
        }

        $actorIsOwner = $this->tenant->membership()?->loadMissing('role')->role->key === SystemRole::Owner->value;
        $targetIsOwner = $membership->loadMissing('role')->role->key === SystemRole::Owner->value;
        if (($targetIsOwner || $role === SystemRole::Owner) && ! $actorIsOwner) {
            throw new AuthorizationException('Only owners can change owner memberships.');
        }

        return DB::transaction(function () use ($membership, $role, $status, $targetIsOwner) {
            $before = ['role' => $membership->role->key, 'status' => $membership->status->value];

            if ($role) {
                $membership->role_id = Role::system($role)->getKey();
            }
            if ($status) {
                $membership->status = $status;
            }

            $losingOwner = $targetIsOwner && (
                ($role && $role !== SystemRole::Owner) || ($status && $status !== MembershipStatus::Active)
            );
            if ($losingOwner) {
                $otherOwners = Membership::query()
                    ->where('organization_id', $membership->organization_id)
                    ->whereKeyNot($membership->getKey())
                    ->where('status', MembershipStatus::Active)
                    ->whereHas('role', fn ($q) => $q->where('key', SystemRole::Owner->value))
                    ->lockForUpdate()
                    ->pluck('id')
                    ->count();
                if ($otherOwners === 0) {
                    throw ValidationException::withMessages(['membership' => 'An organisation must keep at least one active owner.']);
                }
            }

            $membership->save();
            $membership->load('role');
            $after = ['role' => $membership->role->key, 'status' => $membership->status->value];

            if ($before !== $after) {
                $this->audit->record('membership.updated', $membership, before: $before, after: $after);
            }

            return $membership->load('user');
        });
    }
}
