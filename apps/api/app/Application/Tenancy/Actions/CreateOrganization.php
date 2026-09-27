<?php

namespace App\Application\Tenancy\Actions;

use App\Application\Audit\AuditLogger;
use App\Domain\Identity\Enums\SystemRole;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\Enums\MembershipStatus;
use App\Domain\Tenancy\Models\Organization;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** Creates an organisation with its first Owner membership. */
class CreateOrganization
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly TenantContext $tenant,
    ) {}

    /** @param array{country_code?: string, base_currency?: string, is_demo?: bool} $attributes */
    public function handle(string $name, User $owner, array $attributes = []): Organization
    {
        return DB::transaction(function () use ($name, $owner, $attributes) {
            $organization = Organization::query()->create([
                'name' => $name,
                'slug' => Str::slug($name).'-'.Str::lower(Str::random(6)),
                'country_code' => $attributes['country_code'] ?? 'PH',
                'base_currency' => $attributes['base_currency'] ?? 'PHP',
                'is_demo' => $attributes['is_demo'] ?? false,
                'settings' => [],
            ]);

            $membership = $organization->memberships()->create([
                'user_id' => $owner->getKey(),
                'role_id' => Role::system(SystemRole::Owner)->getKey(),
                'status' => MembershipStatus::Active,
            ]);

            if (! $owner->current_organization_id) {
                $owner->forceFill(['current_organization_id' => $organization->getKey()])->save();
            }

            $this->tenant->runAs($organization, fn () => $this->audit->record(
                'organization.created',
                $organization,
                after: $organization->only(['name', 'slug', 'country_code', 'base_currency', 'is_demo']),
                metadata: ['owner_membership_id' => $membership->getKey()],
            ));

            return $organization;
        });
    }
}
