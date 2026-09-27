<?php

use App\Domain\Identity\Enums\Permission;
use App\Domain\Identity\Enums\SystemRole;
use App\Domain\Identity\Models\Role;
use App\Domain\Tenancy\Enums\MembershipStatus;
use App\Domain\Tenancy\Models\Organization;
use App\Domain\Tenancy\TenantContext;
use Database\Seeders\RbacCatalogueSeeder;
use Illuminate\Support\Facades\Gate;

it('grants exactly the catalogue permissions of each system role', function (SystemRole $role) {
    [$user, $organization, $membership] = member($role);
    app(TenantContext::class)->set($organization, $membership);

    $expected = collect($role->permissions())->map->value;

    foreach (Permission::cases() as $permission) {
        expect(Gate::forUser($user)->allows($permission->value))
            ->toBe($expected->contains($permission->value), "{$role->value} / {$permission->value}");
    }
})->with(SystemRole::cases());

it('keeps preparation and approval separate for preparers and reviewers', function () {
    expect(SystemRole::TaxPreparer->permissions())->not->toContain(Permission::CalculationsApprove)
        ->and(SystemRole::Reviewer->permissions())->not->toContain(Permission::CalculationsRun)
        ->and(SystemRole::ReadOnly->permissions())->each->toBeIn([
            Permission::ClientsView, Permission::TaxProfileView, Permission::TaxRulesView,
            Permission::WorkingPapersView, Permission::FormsView,
        ]);
});

it('does not carry a role from one organisation into another', function () {
    [$user, $orgA] = member(SystemRole::Owner);
    $orgB = Organization::factory()->create();
    $membershipB = $orgB->memberships()->create([
        'user_id' => $user->id,
        'role_id' => Role::system(SystemRole::ReadOnly)->id,
        'status' => MembershipStatus::Active,
    ]);

    app(TenantContext::class)->runAs($orgB, function () use ($user) {
        expect(Gate::forUser($user)->allows('settings.manage'))->toBeFalse()
            ->and(Gate::forUser($user)->allows('clients.view'))->toBeTrue();
    }, $membershipB);
});

it('denies every permission when there is no tenant context', function () {
    [$user] = member(SystemRole::Owner);

    expect(Gate::forUser($user)->allows('clients.view'))->toBeFalse();
});

it('denies every permission for a suspended membership', function () {
    [$user, $organization, $membership] = member(SystemRole::Owner, status: MembershipStatus::Suspended);
    app(TenantContext::class)->set($organization, $membership);

    expect(Gate::forUser($user)->allows('clients.view'))->toBeFalse();
});

it('synchronises the catalogue idempotently', function () {
    $this->seed(RbacCatalogueSeeder::class);

    expect(App\Domain\Identity\Models\Permission::query()->count())->toBe(count(Permission::cases()))
        ->and(Role::query()->whereNull('organization_id')->count())->toBe(count(SystemRole::cases()));
});
