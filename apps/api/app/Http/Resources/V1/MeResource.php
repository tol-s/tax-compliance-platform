<?php

namespace App\Http\Resources\V1;

use App\Application\Identity\Authorization\PermissionResolver;
use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\Enums\MembershipStatus;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The authenticated principal as the frontend needs it: identity, current
 * tenant and role, effective permissions (for UI affordances only; the API
 * re-checks every action) and the organisations the user can switch to.
 *
 * @mixin User
 */
class MeResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $tenant = app(TenantContext::class);
        $membership = $tenant->membership()?->loadMissing('role', 'organization');

        return [
            'user' => [
                'id' => $this->id,
                'name' => $this->name,
                'email' => $this->email,
                'mfa_enabled' => $this->mfa_enabled_at !== null,
            ],
            'organization' => $membership ? new OrganizationResource($membership->organization) : null,
            'role' => $membership ? [
                'key' => $membership->role->key,
                'name' => $membership->role->name,
                'sees_all_clients' => $membership->role->sees_all_clients,
            ] : null,
            'permissions' => app(PermissionResolver::class)->permissionsFor($this->resource),
            'memberships' => MembershipResource::collection(
                $this->memberships()
                    ->where('status', MembershipStatus::Active)
                    ->with(['organization', 'role'])
                    ->get()
                    ->sortBy('organization.name')
                    ->values()
            ),
        ];
    }
}
