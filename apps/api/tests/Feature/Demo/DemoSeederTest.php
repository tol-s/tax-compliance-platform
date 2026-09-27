<?php

use App\Domain\Clients\Models\Client;
use App\Domain\Tenancy\Models\Organization;
use App\Domain\Tenancy\TenantContext;
use Database\Seeders\DemoSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

beforeEach(fn () => Storage::fake(config('filesystems.documents_disk')));

it('refuses to seed unless demo mode is explicitly enabled', function () {
    config(['app.demo_mode' => false]);

    expect(fn () => $this->seed(DemoSeeder::class))->toThrow(RuntimeException::class);
    expect(Organization::query()->count())->toBe(0);
});

it('seeds flagged staging data through the real actions', function () {
    config(['app.demo_mode' => true]);
    $this->seed(DemoSeeder::class);

    $firm = Organization::query()->where('name', DemoSeeder::ORGANIZATION_NAME)->firstOrFail();
    expect($firm->is_demo)->toBeTrue()
        ->and(Organization::query()->where('is_demo', false)->count())->toBe(0);

    app(TenantContext::class)->runAs($firm, function () {
        $clients = Client::query()->get();
        expect($clients)->toHaveCount(24)
            ->and($clients->every(fn (Client $c) => str_starts_with($c->taxpayer_identifier, '000-')))->toBeTrue();
    });

    // History is appended, never rewritten: 24 initial records plus 7 evidenced changes.
    expect(DB::table('tax_registration_statuses')->where('organization_id', $firm->id)->count())->toBe(31)
        ->and(DB::table('audit_logs')->where('organization_id', $firm->id)->where('action', 'registration_status.changed')->count())->toBe(7);

    // No tax rules, rates or thresholds are created by staging data.
    expect(collect(DB::select("select tablename from pg_tables where schemaname = 'public'"))->pluck('tablename'))
        ->not->toContain('tax_rules', 'tax_thresholds');
});

it('gives every member of the main firm a year of their own activity, and nothing in the future', function () {
    config(['app.demo_mode' => true]);
    $this->seed(DemoSeeder::class);

    $firm = Organization::query()->where('name', DemoSeeder::ORGANIZATION_NAME)->firstOrFail();
    $members = DB::table('organization_user')->where('organization_id', $firm->id)->pluck('user_id');

    foreach ($members as $userId) {
        expect(DB::table('audit_logs')->where('actor_id', $userId)->where('action', 'auth.login')->count())->toBeGreaterThan(0);
    }

    // Roles that only see assigned clients have clients to see.
    foreach (['tax-preparer', 'tax-preparer-2', 'accountant', 'read-only'] as $key) {
        $user = DB::table('users')->where('email', "{$key}@demo.test")->value('id');
        expect(DB::table('client_user')->where('user_id', $user)->count())->toBeGreaterThanOrEqual(4);
    }

    $months = DB::table('audit_logs')->where('organization_id', $firm->id)
        ->selectRaw("count(distinct to_char(created_at at time zone 'Asia/Manila', 'YYYY-MM')) as months")->value('months');
    expect($months)->toBe(12)
        ->and(DB::table('audit_logs')->where('created_at', '>', '2026-09-26 00:00:00+08')->count())->toBe(0);

    $suspended = DB::table('users')->where('email', 'former-staff@demo.test')->value('id');
    expect(DB::table('audit_logs')->where('actor_id', $suspended)->where('created_at', '>', '2026-07-01 00:00:00+08')->count())->toBe(0);
});

it('is idempotent', function () {
    config(['app.demo_mode' => true]);
    $this->seed(DemoSeeder::class);
    $this->seed(DemoSeeder::class);

    expect(Organization::query()->where('name', DemoSeeder::ORGANIZATION_NAME)->count())->toBe(1);
});
