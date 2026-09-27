<?php

namespace App\Policies;

use App\Application\Clients\ClientAccess;
use App\Domain\Clients\Models\Client;
use App\Domain\Identity\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * Permission (what you may do) AND client visibility (which clients). A client
 * you cannot see answers 404, not 403, so its existence is not disclosed.
 */
class ClientPolicy
{
    public function __construct(private readonly ClientAccess $access) {}

    public function viewAny(User $user): bool
    {
        return $user->can('clients.view');
    }

    public function create(User $user): bool
    {
        return $user->can('clients.create');
    }

    public function view(User $user, Client $client): Response
    {
        return $this->gate($user, $client, 'clients.view');
    }

    public function update(User $user, Client $client): Response
    {
        return $this->gate($user, $client, 'clients.edit');
    }

    public function viewTaxProfile(User $user, Client $client): Response
    {
        return $this->gate($user, $client, 'tax_profile.view');
    }

    public function editTaxProfile(User $user, Client $client): Response
    {
        return $this->gate($user, $client, 'tax_profile.edit');
    }

    public function viewAudit(User $user, Client $client): Response
    {
        return $this->gate($user, $client, 'audit.view');
    }

    /** Assigning people is a management task: it needs clients.edit and organisation-wide visibility. */
    public function manageAssignments(User $user, Client $client): Response
    {
        if (! $this->access->seesAllClients($user)) {
            return Response::denyAsNotFound();
        }

        return $user->can('clients.edit') ? Response::allow() : Response::deny();
    }

    private function gate(User $user, Client $client, string $permission): Response
    {
        if (! $this->access->canSee($user, $client)) {
            return Response::denyAsNotFound();
        }

        return $user->can($permission) ? Response::allow() : Response::deny();
    }
}
