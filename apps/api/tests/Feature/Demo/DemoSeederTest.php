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

it('seeds clearly fictional, demo-flagged data through the real actions', function () {
    config(['app.demo_mode' => true]);
    $this->seed(DemoSeeder::class);

    $firm = Organization::query()->where('name', DemoSeeder::ORGANIZATION_NAME)->firstOrFail();
    expect($firm->is_demo)->toBeTrue()
        ->and(Organization::query()->where('is_demo', false)->count())->toBe(0);

    app(TenantContext::class)->runAs($firm, function () {
        $clients = Client::query()->get();
        expect($clients)->toHaveCount(12)
            ->and($clients->every(fn (Client $c) => str_starts_with($c->taxpayer_identifier, '000-')))->toBeTrue();
    });

    // History is appended, never rewritten: 12 initial records plus 3 evidenced changes.
    expect(DB::table('tax_registration_statuses')->where('organization_id', $firm->id)->count())->toBe(15)
        ->and(DB::table('audit_logs')->where('action', 'registration_status.changed')->count())->toBe(3);

    // No tax rules, rates or thresholds are created by demo data.
    expect(collect(DB::select("select tablename from pg_tables where schemaname = 'public'"))->pluck('tablename'))
        ->not->toContain('tax_rules', 'tax_thresholds');
});

it('is idempotent', function () {
    config(['app.demo_mode' => true]);
    $this->seed(DemoSeeder::class);
    $this->seed(DemoSeeder::class);

    expect(Organization::query()->where('name', DemoSeeder::ORGANIZATION_NAME)->count())->toBe(1);
});
