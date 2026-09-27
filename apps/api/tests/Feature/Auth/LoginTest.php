<?php

use App\Domain\Audit\Models\AuditLog;
use App\Domain\Identity\Enums\SystemRole;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\PersonalAccessToken;

it('issues an expiring bearer token for valid credentials and audits the login', function () {
    [$user, $organization] = member(SystemRole::TaxPreparer);

    $response = $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'password'])
        ->assertOk()
        ->assertJsonStructure(['data' => ['token', 'token_type', 'expires_at']]);

    expect($response->json('data.token_type'))->toBe('Bearer')
        ->and(PersonalAccessToken::query()->first()->expires_at)->not->toBeNull();

    $log = DB::table('audit_logs')->where('action', 'auth.login')->first();
    expect($log->organization_id)->toBe($organization->id)
        ->and($log->actor_id)->toBe($user->id)
        ->and($log->correlation_id)->not->toBeNull();
});

it('rejects bad credentials with the error envelope and audits the failure without the email', function () {
    [$user] = member();

    $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'wrong'])
        ->assertStatus(422)
        ->assertJsonPath('error.code', 'validation_failed')
        ->assertJsonStructure(['error' => ['code', 'message', 'correlation_id', 'details' => ['fields' => ['email']]]]);

    $log = DB::table('audit_logs')->where('action', 'auth.login_failed')->first();
    expect($log)->not->toBeNull()
        ->and($log->organization_id)->toBeNull()
        ->and($log->metadata)->not->toContain($user->email);
});

it('gives the same response for unknown emails as for wrong passwords', function () {
    $this->postJson('/api/v1/auth/login', ['email' => 'nobody@example.test', 'password' => 'x'])
        ->assertStatus(422)
        ->assertJsonPath('error.details.fields.email.0', 'These credentials do not match our records.');
});

it('rate limits repeated login attempts', function () {
    [$user] = member();

    foreach (range(1, 5) as $_) {
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'wrong'])->assertStatus(422);
    }

    $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'wrong'])
        ->assertStatus(429)
        ->assertJsonPath('error.code', 'rate_limited');
});

it('revokes the current token on logout', function () {
    [$user] = member();
    $token = $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'password'])->json('data.token');

    $this->withToken($token)->postJson('/api/v1/auth/logout')->assertNoContent();

    expect(PersonalAccessToken::query()->count())->toBe(0);
    expect(AuditLog::withoutGlobalScopes()->where('action', 'auth.logout')->exists())->toBeTrue();

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson('/api/v1/me')->assertStatus(401)->assertJsonPath('error.code', 'unauthenticated');
});

it('returns the principal with tenant, role and permissions', function () {
    [$user, $organization] = actingAsMember(SystemRole::Reviewer);

    $this->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('data.user.id', $user->id)
        ->assertJsonPath('data.organization.id', $organization->id)
        ->assertJsonPath('data.role.key', 'reviewer')
        ->assertJsonPath('data.permissions', collect(SystemRole::Reviewer->permissions())->pluck('value')->sort()->values()->all())
        ->assertJsonMissingPath('data.user.password');
});

it('sends security headers and echoes a supplied correlation id', function () {
    $id = '01a0e257-e264-7266-b116-a3c7f388c317';

    $this->getJson('/api/v1/health', ['X-Correlation-ID' => $id])
        ->assertHeader('X-Correlation-ID', $id)
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'DENY');
});
