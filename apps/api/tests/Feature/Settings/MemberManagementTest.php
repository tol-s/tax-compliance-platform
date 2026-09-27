<?php

use App\Domain\Identity\Enums\SystemRole;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

it('adds a new person with a one-time temporary password that works for sign-in', function () {
    actingAsMember(SystemRole::Admin);

    $response = $this->postJson('/api/v1/members', ['name' => 'New Preparer', 'email' => 'NEW@example.test', 'role' => 'tax_preparer'])
        ->assertCreated()
        ->assertJsonPath('data.user.email', 'new@example.test')
        ->assertJsonPath('data.role.key', 'tax_preparer');

    $password = $response->json('temporary_password');
    expect($password)->toBeString()->toHaveLength(16);
    expect(DB::table('audit_logs')->where('action', 'membership.created')->value('after'))->not->toContain($password);

    $this->app['auth']->forgetGuards();
    $this->postJson('/api/v1/auth/login', ['email' => 'new@example.test', 'password' => $password])->assertOk();
});

it('adds an existing account from another organisation without issuing a password', function () {
    [$existing] = member(SystemRole::Owner);
    actingAsMember(SystemRole::Owner);

    $this->postJson('/api/v1/members', ['name' => 'Ignored', 'email' => $existing->email, 'role' => 'reviewer'])
        ->assertCreated()
        ->assertJsonPath('temporary_password', null);

    $this->postJson('/api/v1/members', ['name' => 'Again', 'email' => $existing->email, 'role' => 'reviewer'])
        ->assertStatus(422);
});

it('only lets owners grant or change owner access', function () {
    [, $org] = actingAsMember(SystemRole::Admin);
    $this->postJson('/api/v1/members', ['name' => 'X', 'email' => 'x@example.test', 'role' => 'owner'])->assertForbidden();

    [, , $ownerMembership] = member(SystemRole::Owner, $org);
    $this->patchJson("/api/v1/members/{$ownerMembership->id}", ['role' => 'read_only'])->assertForbidden();
});

it('prevents self-edits and removing the last owner', function () {
    [$owner, $org, $ownerMembership] = actingAsMember(SystemRole::Owner);
    $this->patchJson("/api/v1/members/{$ownerMembership->id}", ['role' => 'admin'])->assertStatus(422);

    [, , $second] = member(SystemRole::Owner, $org);
    $this->patchJson("/api/v1/members/{$second->id}", ['status' => 'SUSPENDED'])->assertOk()->assertJsonPath('data.status', 'SUSPENDED');

    [$otherOwner, , $otherMembership] = member(SystemRole::Owner, $org);
    Sanctum::actingAs($otherOwner);
    $this->patchJson("/api/v1/members/{$otherMembership->id}", ['role' => 'admin'])->assertStatus(422);
    Sanctum::actingAs($owner);
    $this->patchJson("/api/v1/members/{$otherMembership->id}", ['role' => 'admin'])->assertOk();

    Sanctum::actingAs($owner);
    [, , $admin] = member(SystemRole::Admin, $org);
    // $owner is now the only active owner: nobody may demote them (and they cannot demote themselves).
    Sanctum::actingAs($admin->user);
    $this->patchJson("/api/v1/members/{$ownerMembership->id}", ['role' => 'admin'])->assertForbidden();
});

it('audits role and status changes', function () {
    [, $org] = actingAsMember(SystemRole::Owner);
    [, , $membership] = member(SystemRole::ReadOnly, $org);

    $this->patchJson("/api/v1/members/{$membership->id}", ['role' => 'reviewer'])->assertOk();

    $row = DB::table('audit_logs')->where('action', 'membership.updated')->first();
    expect(json_decode($row->before, true))->toBe(['role' => 'read_only', 'status' => 'ACTIVE'])
        ->and(json_decode($row->after, true))->toBe(['role' => 'reviewer', 'status' => 'ACTIVE']);
});

it('keeps member management within the tenant', function () {
    [, , $foreign] = member(SystemRole::ReadOnly);
    actingAsMember(SystemRole::Owner);

    $this->patchJson("/api/v1/members/{$foreign->id}", ['role' => 'reviewer'])->assertNotFound();
    $this->getJson('/api/v1/members')->assertJsonCount(1, 'data');
});

it('exposes the role and permission matrix to settings managers only', function () {
    actingAsMember(SystemRole::Admin);
    $this->getJson('/api/v1/roles')
        ->assertOk()
        ->assertJsonCount(7, 'data')
        ->assertJsonPath('data.0.key', 'owner')
        ->assertJsonCount(20, 'permissions');

    actingAsMember(SystemRole::Reviewer);
    $this->getJson('/api/v1/roles')->assertForbidden();
});
