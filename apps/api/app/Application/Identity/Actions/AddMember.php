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
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Adds a person to the current organisation. A new account receives a random
 * temporary password returned exactly once (no email provider is configured
 * yet); an existing account from another organisation just gains a membership.
 */
class AddMember
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly TenantContext $tenant,
    ) {}

    /** @return array{membership: Membership, temporary_password: ?string} */
    public function handle(User $actor, string $name, string $email, SystemRole $role): array
    {
        if ($role === SystemRole::Owner && $this->tenant->membership()?->role?->key !== SystemRole::Owner->value) {
            throw new AuthorizationException('Only owners can add owners.');
        }

        return DB::transaction(function () use ($name, $email, $role) {
            $email = mb_strtolower(trim($email));
            $organizationId = $this->tenant->organizationId();
            $user = User::query()->where('email', $email)->first();
            $password = null;

            if ($user && $user->memberships()->where('organization_id', $organizationId)->exists()) {
                throw ValidationException::withMessages(['email' => 'This person is already a member of the organisation.']);
            }

            if (! $user) {
                $password = Str::password(16, symbols: false);
                $user = User::query()->create(['name' => $name, 'email' => $email, 'password' => $password]);
                $user->forceFill(['current_organization_id' => $organizationId])->save();
            }

            $membership = Membership::query()->create([
                'organization_id' => $organizationId,
                'user_id' => $user->getKey(),
                'role_id' => Role::system($role)->getKey(),
                'status' => MembershipStatus::Active,
            ]);

            $this->audit->record('membership.created', $membership, after: [
                'user_id' => $user->getKey(),
                'email' => $email,
                'role' => $role->value,
                'new_account' => $password !== null,
            ]);

            return ['membership' => $membership->load(['user', 'role']), 'temporary_password' => $password];
        });
    }
}
