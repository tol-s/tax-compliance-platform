<?php

use App\Domain\Identity\Enums\SystemRole;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\Enums\MembershipStatus;
use App\Domain\Tenancy\Models\Membership;
use App\Domain\Tenancy\Models\Organization;
use Database\Seeders\RbacCatalogueSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->beforeEach(fn () => $this->seed(RbacCatalogueSeeder::class))
    ->in('Feature', 'Golden');

/**
 * Create a user holding the given system role in an organisation.
 *
 * @return array{0: User, 1: Organization, 2: Membership}
 */
function member(SystemRole $role = SystemRole::Owner, ?Organization $organization = null, MembershipStatus $status = MembershipStatus::Active): array
{
    $organization ??= Organization::factory()->create();
    $user = User::factory()->create(['current_organization_id' => $organization->id]);
    $membership = $organization->memberships()->create([
        'user_id' => $user->id,
        'role_id' => Role::system($role)->id,
        'status' => $status,
    ]);

    return [$user->refresh(), $organization, $membership];
}

/** @return array{0: User, 1: Organization, 2: Membership} */
function actingAsMember(SystemRole $role = SystemRole::Owner, ?Organization $organization = null): array
{
    $result = member($role, $organization);
    Sanctum::actingAs($result[0]);

    return $result;
}
