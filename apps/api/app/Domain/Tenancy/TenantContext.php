<?php

namespace App\Domain\Tenancy;

use App\Domain\Tenancy\Exceptions\MissingTenantContext;
use App\Domain\Tenancy\Models\Membership;
use App\Domain\Tenancy\Models\Organization;
use Closure;
use Illuminate\Support\Facades\Context;

/**
 * Request- or job-scoped holder of the current tenant. It is only ever set
 * server-side (from the authenticated membership, or from a job payload) and
 * never from client input.
 */
final class TenantContext
{
    private ?Organization $organization = null;

    private ?Membership $membership = null;

    public function set(Organization $organization, ?Membership $membership = null): void
    {
        $this->organization = $organization;
        $this->membership = $membership;
        Context::add('organization_id', $organization->getKey());
    }

    public function clear(): void
    {
        $this->organization = null;
        $this->membership = null;
        Context::forget('organization_id');
    }

    public function has(): bool
    {
        return $this->organization !== null;
    }

    public function organization(): Organization
    {
        return $this->organization ?? throw new MissingTenantContext('No tenant context established.');
    }

    public function organizationId(): string
    {
        return $this->organization()->getKey();
    }

    public function membership(): ?Membership
    {
        return $this->membership;
    }

    /**
     * Run a callback inside a specific tenant, restoring the previous context
     * afterwards. Used by queued jobs, commands and seeders.
     *
     * @template T
     *
     * @param  Closure(): T  $callback
     * @return T
     */
    public function runAs(Organization $organization, Closure $callback, ?Membership $membership = null): mixed
    {
        [$previousOrg, $previousMembership] = [$this->organization, $this->membership];
        $this->set($organization, $membership);

        try {
            return $callback();
        } finally {
            $previousOrg ? $this->set($previousOrg, $previousMembership) : $this->clear();
        }
    }
}
