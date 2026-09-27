<?php

namespace App\Application\Clients;

use App\Domain\Clients\Models\Client;
use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Builder;

/**
 * Client-level visibility inside a tenant. Roles flagged sees_all_clients see
 * every client; everyone else sees only clients assigned to them. Invisible
 * clients behave as if they do not exist (404), so their existence never leaks.
 */
class ClientAccess
{
    public function __construct(private readonly TenantContext $tenant) {}

    public function seesAllClients(User $user): bool
    {
        $membership = $this->tenant->membership();

        if (! $membership || $membership->user_id !== $user->getKey() || ! $membership->isActive()) {
            return false;
        }

        return (bool) $membership->loadMissing('role')->role->sees_all_clients;
    }

    /** @return Builder<Client> */
    public function visibleClients(User $user): Builder
    {
        return Client::query()->visibleTo($user, $this->seesAllClients($user));
    }

    public function canSee(User $user, Client $client): bool
    {
        return $this->seesAllClients($user)
            || $client->assignedUsers()->whereKey($user->getKey())->exists();
    }
}
