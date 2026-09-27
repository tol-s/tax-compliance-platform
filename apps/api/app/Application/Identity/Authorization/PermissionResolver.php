<?php

namespace App\Application\Identity\Authorization;

use App\Domain\Identity\Enums\Permission;
use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\Models\Membership;
use App\Domain\Tenancy\TenantContext;

/**
 * Resolves the permissions a user holds in the current tenant, through their
 * active membership's role. Memoised per membership for the lifetime of the
 * request/job (the resolver is scoped, see AppServiceProvider).
 */
class PermissionResolver
{
    /** @var array<string, list<string>> */
    private array $cache = [];

    public function __construct(private readonly TenantContext $tenant) {}

    public function isPermission(string $ability): bool
    {
        return Permission::tryFrom($ability) !== null;
    }

    public function allows(User $user, Permission|string $permission): bool
    {
        $key = $permission instanceof Permission ? $permission->value : $permission;

        return in_array($key, $this->permissionsFor($user), true);
    }

    /** @return list<string> */
    public function permissionsFor(User $user): array
    {
        $membership = $this->membershipFor($user);

        if (! $membership?->isActive()) {
            return [];
        }

        return $this->cache[$membership->getKey()] ??= $membership->role()
            ->firstOrFail()
            ->permissions()
            ->orderBy('key')
            ->pluck('key')
            ->all();
    }

    private function membershipFor(User $user): ?Membership
    {
        if (! $this->tenant->has()) {
            return null;
        }

        $membership = $this->tenant->membership();

        // The context membership is only trusted for the user it was resolved for.
        if ($membership && $membership->user_id === $user->getKey()) {
            return $membership;
        }

        return $user->activeMembershipFor($this->tenant->organizationId());
    }
}
