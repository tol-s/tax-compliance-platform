<?php

use App\Application\Audit\AuditLogger;
use App\Domain\Audit\Models\AuditLog;
use App\Domain\Identity\Enums\SystemRole;
use App\Domain\Identity\Models\Role;
use App\Domain\Tenancy\TenantContext;
use App\Support\CorrelationId;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    [$this->user, $this->organization, $membership] = member(SystemRole::Owner);
    app(TenantContext::class)->set($this->organization, $membership);
    $this->actingAs($this->user);
});

it('records actor, tenant, entity and correlation id from context', function () {
    $correlation = CorrelationId::set(null);

    $log = app(AuditLogger::class)->record('client.updated', $this->organization, ['name' => 'A'], ['name' => 'B']);

    expect($log->fresh())
        ->organization_id->toBe($this->organization->id)
        ->actor_id->toBe($this->user->id)
        ->actor_type->toBe('user')
        ->entity_id->toBe($this->organization->id)
        ->before->toBe(['name' => 'A'])
        ->after->toBe(['name' => 'B'])
        ->correlation_id->toBe($correlation);
});

it('redacts secrets in snapshots, including nested ones', function () {
    $log = app(AuditLogger::class)->record('integration.connected', after: [
        'provider' => 'XERO',
        'access_token' => 'plaintext-token',
        'nested' => ['refresh_token' => 'r', 'password' => 'p'],
    ]);

    expect($log->fresh()->after)->toEqual([
        'provider' => 'XERO',
        'access_token' => '[redacted]',
        'nested' => ['refresh_token' => '[redacted]', 'password' => '[redacted]'],
    ]);
});

it('is append-only at the database level', function (string $sql) {
    app(AuditLogger::class)->record('test.event');

    expect(fn () => DB::statement($sql))->toThrow(QueryException::class, 'append-only');
})->with([
    'update' => "UPDATE audit_logs SET action = 'tampered'",
    'delete' => 'DELETE FROM audit_logs',
    'truncate' => 'TRUNCATE audit_logs',
]);

it('refuses updates and deletes through the model', function () {
    $log = app(AuditLogger::class)->record('test.event');

    expect(fn () => $log->update(['action' => 'tampered']))->toThrow(LogicException::class)
        ->and(fn () => $log->delete())->toThrow(LogicException::class);
});

it('scopes audit reads to the current tenant', function () {
    app(AuditLogger::class)->record('mine');
    [, $other, $otherMembership] = member(SystemRole::Owner);
    app(TenantContext::class)->runAs($other, fn () => app(AuditLogger::class)->record('theirs'), $otherMembership);

    expect(AuditLog::query()->pluck('action')->all())->toBe(['mine']);
});

it('audits organisation switches with before and after', function () {
    [$user, $first] = actingAsMember(SystemRole::Owner);
    [, $second] = member(SystemRole::Owner);
    $second->memberships()->create([
        'user_id' => $user->id,
        'role_id' => Role::system(SystemRole::Reviewer)->id,
        'status' => 'ACTIVE',
    ]);

    $this->postJson('/api/v1/me/organization', ['organization_id' => $second->id])->assertNoContent();

    $row = DB::table('audit_logs')->where('action', 'organization.switched')->first();
    expect(json_decode($row->before, true))->toBe(['organization_id' => $first->id])
        ->and(json_decode($row->after, true))->toBe(['organization_id' => $second->id])
        ->and($row->organization_id)->toBe($second->id);
});
