<?php

use App\Domain\Identity\Enums\SystemRole;
use App\Domain\Identity\Models\Role;
use App\Domain\Tenancy\Concerns\BelongsToOrganization;
use App\Domain\Tenancy\Enums\MembershipStatus;
use App\Domain\Tenancy\Exceptions\MissingTenantContext;
use App\Domain\Tenancy\Models\Organization;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;

/** A throwaway tenant-owned model so isolation is tested independently of any domain feature. */
class TenantWidget extends Model
{
    use BelongsToOrganization, HasUuids;

    protected $table = 'tenant_widgets';

    protected $guarded = [];
}

beforeEach(function () {
    Schema::create('tenant_widgets', function (Blueprint $table) {
        $table->uuid('id')->primary();
        $table->foreignUuid('organization_id')->constrained();
        $table->string('name');
        $table->timestamps();
    });
    $this->tenant = app(TenantContext::class);
});

it('fails closed when a tenant-owned model is queried without a tenant context', function () {
    TenantWidget::query()->count();
})->throws(MissingTenantContext::class);

it('fails closed when a tenant-owned model is created without a tenant context', function () {
    TenantWidget::query()->withoutGlobalScopes()->create(['name' => 'orphan']);
})->throws(MissingTenantContext::class);

it('stamps organization_id from the context and ignores caller-supplied values', function () {
    [$a, $b] = Organization::factory()->count(2)->create();

    $widget = $this->tenant->runAs($a, fn () => TenantWidget::query()->create([
        'name' => 'spoofed', 'organization_id' => $b->id,
    ]));

    expect($widget->organization_id)->toBe($a->id);
});

it('only returns the current tenant\'s rows', function () {
    [$a, $b] = Organization::factory()->count(2)->create();
    $this->tenant->runAs($a, fn () => TenantWidget::query()->create(['name' => 'a-1']));
    $this->tenant->runAs($b, fn () => TenantWidget::query()->create(['name' => 'b-1']));
    $bWidgetId = $this->tenant->runAs($b, fn () => TenantWidget::query()->value('id'));

    $this->tenant->runAs($a, function () use ($bWidgetId) {
        expect(TenantWidget::query()->pluck('name')->all())->toBe(['a-1'])
            ->and(TenantWidget::query()->find($bWidgetId))->toBeNull();
    });
});

it('refuses to move a record to another tenant', function () {
    [$a, $b] = Organization::factory()->count(2)->create();

    $this->tenant->runAs($a, function () use ($b) {
        $widget = TenantWidget::query()->create(['name' => 'w']);
        $widget->organization_id = $b->id;
        $widget->save();
    });
})->throws(LogicException::class);

it('restores the previous tenant after runAs', function () {
    [$a, $b] = Organization::factory()->count(2)->create();

    $this->tenant->runAs($a, function () use ($a, $b) {
        $this->tenant->runAs($b, fn () => expect($this->tenant->organizationId())->toBe($b->id));
        expect($this->tenant->organizationId())->toBe($a->id);
    });

    expect($this->tenant->has())->toBeFalse();
});

it('resolves the tenant from the membership, not from request input', function () {
    [$user, $mine] = actingAsMember(SystemRole::Owner);
    $other = Organization::factory()->create();

    $this->getJson('/api/v1/me?organization_id='.$other->id, ['X-Organization-Id' => $other->id])
        ->assertOk()
        ->assertJsonPath('data.organization.id', $mine->id);
});

it('lets a user switch only to organisations where they are an active member', function () {
    [$user, $first] = actingAsMember(SystemRole::Owner);
    [, $second] = member(SystemRole::ReadOnly);
    $second->memberships()->create([
        'user_id' => $user->id,
        'role_id' => Role::system(SystemRole::ReadOnly)->id,
        'status' => MembershipStatus::Active,
    ]);
    $stranger = Organization::factory()->create();

    $this->postJson('/api/v1/me/organization', ['organization_id' => $stranger->id])
        ->assertForbidden()
        ->assertJsonPath('error.code', 'forbidden');

    $this->postJson('/api/v1/me/organization', ['organization_id' => $second->id])->assertNoContent();

    $this->getJson('/api/v1/me')
        ->assertJsonPath('data.organization.id', $second->id)
        ->assertJsonPath('data.role.key', 'read_only')
        ->assertJsonCount(2, 'data.memberships');
});

it('blocks users whose only membership is suspended', function () {
    [$user] = member(SystemRole::Owner, status: MembershipStatus::Suspended);
    Sanctum::actingAs($user);

    $this->getJson('/api/v1/me')
        ->assertForbidden()
        ->assertJsonPath('error.code', 'no_active_membership');
});
