<?php

namespace Database\Seeders;

use App\Application\Clients\Actions\CreateClient;
use App\Application\Clients\Actions\RecordRegistrationStatus;
use App\Application\Clients\Actions\SyncClientAssignments;
use App\Application\Clients\Actions\UpdateClient;
use App\Application\Documents\Actions\StoreDocument;
use App\Application\Tenancy\Actions\CreateOrganization;
use App\Domain\Clients\Enums\StatusSource;
use App\Domain\Clients\Enums\VatStatus;
use App\Domain\Clients\Models\Client;
use App\Domain\Documents\Enums\DocumentKind;
use App\Domain\Identity\Enums\SystemRole;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\Enums\MembershipStatus;
use App\Domain\Tenancy\Models\Membership;
use App\Domain\Tenancy\Models\Organization;
use App\Domain\Tenancy\TenantContext;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Database\Seeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use RuntimeException;

/**
 * Seeds a clearly fictional demonstration environment:
 *
 * - "Demo Accounting Firm" with one user per system role (plus a second
 *   preparer and a suspended user), and a second firm to show switching.
 * - Twelve fictional taxpayers covering VAT and non-VAT registrations, verified
 *   and unverified sources, a NON-VAT to VAT change with evidence, and an
 *   administrator correction, with team assignments.
 * - Activity spread over past months, written through the real application
 *   actions so the audit trail is exactly what the product would record.
 *
 * Every taxpayer identifier uses the reserved 000- prefix, every certificate is
 * a placeholder file marked "DEMO PLACEHOLDER", and the organisation is flagged
 * is_demo so the UI shows a fictional-data banner. No tax rule, rate or
 * threshold is created here.
 *
 * Guarded: refuses to run in production or without DEMO_MODE=true.
 */
class DemoSeeder extends Seeder
{
    public const ORGANIZATION_NAME = 'Demo Accounting Firm';

    public const SECOND_ORGANIZATION_NAME = 'Demo Audit Partners';

    /** Local default only. Deployed demos must set DEMO_PASSWORD to something private. */
    public const PASSWORD = 'demo-password';

    /** @var array<string, User> */
    private array $users = [];

    /** @var array<string, Client> */
    private array $clients = [];

    private Organization $organization;

    public function run(CreateOrganization $createOrganization): void
    {
        if (app()->isProduction() || ! config('app.demo_mode')) {
            throw new RuntimeException('DemoSeeder requires DEMO_MODE=true and a non-production environment.');
        }

        if (Organization::query()->where('name', self::ORGANIZATION_NAME)->where('is_demo', true)->exists()) {
            return;
        }

        try {
            $this->at('2026-03-02 09:00', function () use ($createOrganization) {
                $owner = $this->user('owner', 'Maria Santos (Demo Owner)');
                $this->organization = $createOrganization->handle(self::ORGANIZATION_NAME, $owner, ['is_demo' => true]);
                $this->seedMembers();
            });

            $this->seedTaxpayers();
            $this->seedRegistrationChanges();
            $this->seedProfileUpdates();
            $this->seedSupportingDocuments();
            $this->seedAssignments();
            $this->seedSecondOrganization($createOrganization);
        } finally {
            Carbon::setTestNow();
            CarbonImmutable::setTestNow();
            Auth::forgetUser();
        }
    }

    private function seedMembers(): void
    {
        $people = [
            ['admin', 'Jose Reyes (Demo Admin)', SystemRole::Admin, MembershipStatus::Active],
            ['tax-manager', 'Ana Cruz (Demo Tax Manager)', SystemRole::TaxManager, MembershipStatus::Active],
            ['tax-preparer', 'Paolo Garcia (Demo Tax Preparer)', SystemRole::TaxPreparer, MembershipStatus::Active],
            ['tax-preparer-2', 'Bea Mendoza (Demo Tax Preparer)', SystemRole::TaxPreparer, MembershipStatus::Active],
            ['reviewer', 'Carlo Villanueva (Demo Reviewer)', SystemRole::Reviewer, MembershipStatus::Active],
            ['accountant', 'Liza Ramos (Demo Accountant)', SystemRole::Accountant, MembershipStatus::Active],
            ['read-only', 'Miguel Torres (Demo Read Only)', SystemRole::ReadOnly, MembershipStatus::Active],
            ['former-staff', 'Nina Flores (Demo, suspended)', SystemRole::TaxPreparer, MembershipStatus::Suspended],
        ];

        foreach ($people as [$key, $name, $role, $status]) {
            $user = $this->user($key, $name);
            $this->organization->memberships()->create([
                'user_id' => $user->getKey(),
                'role_id' => Role::system($role)->getKey(),
                'status' => $status,
            ]);
            $user->forceFill(['current_organization_id' => $this->organization->getKey()])->save();
        }
    }

    /**
     * [key, legal name, trade name, TIN, entity, industry, city, VAT status, source, effective from, created on, created by]
     */
    private function seedTaxpayers(): void
    {
        $taxpayers = [
            ['harbourline', 'Harbourline Trading Corporation', 'Harbourline', '000-101-201-00000', 'CORPORATION', 'Wholesale trade', 'Makati City', 'VAT_REGISTERED', 'BIR_CERTIFICATE', '2023-01-02', '2026-03-03 10:15', 'tax-manager'],
            ['sampaguita', 'Sampaguita Design Studio', 'Sampaguita Studio', '000-102-202-00000', 'SOLE_PROPRIETORSHIP', 'Creative services', 'Quezon City', 'NON_VAT', 'BIR_CERTIFICATE', '2024-03-01', '2026-03-05 14:40', 'tax-manager'],
            ['bayanihan', 'Bayanihan Farmers Cooperative', null, '000-103-203-00000', 'COOPERATIVE', 'Agriculture', 'Tarlac City', 'NON_VAT', 'BIR_CERTIFICATE', '2021-06-15', '2026-03-09 09:30', 'tax-manager'],
            ['kalayaan', 'Kalayaan Logistics Inc.', 'Kalayaan Express', '000-104-204-00000', 'CORPORATION', 'Logistics', 'Pasig City', 'NON_VAT', 'BIR_CERTIFICATE', '2022-07-01', '2026-03-12 11:05', 'tax-manager'],
            ['mabuhay', 'Mabuhay Bakeshop', null, '000-105-205-00000', 'SOLE_PROPRIETORSHIP', 'Food retail', 'Cebu City', 'NON_VAT', 'USER_ENTERED', '2025-01-06', '2026-04-01 16:20', 'owner'],
            ['pacific-crest', 'Pacific Crest Software Solutions Inc.', 'Pacific Crest', '000-106-206-00000', 'CORPORATION', 'IT services', 'Taguig City', 'VAT_REGISTERED', 'BIR_CERTIFICATE', '2020-09-01', '2026-04-07 10:00', 'tax-manager'],
            ['isla-verde', 'Isla Verde Resort Partnership', 'Isla Verde Resort', '000-107-207-00000', 'PARTNERSHIP', 'Hospitality', 'Puerto Princesa', 'VAT_REGISTERED', 'BIR_CERTIFICATE', '2019-11-04', '2026-04-15 13:45', 'tax-manager'],
            ['luzon-precision', 'Luzon Precision Engineering Corp.', 'LPE', '000-108-208-00000', 'CORPORATION', 'Manufacturing', 'Calamba', 'VAT_REGISTERED', 'BIR_CERTIFICATE', '2018-02-19', '2026-05-04 09:10', 'admin'],
            ['tala', 'Tala Wellness Clinic', null, '000-109-209-00000', 'SOLE_PROPRIETORSHIP', 'Healthcare', 'Davao City', 'NON_VAT', 'BIR_CERTIFICATE', '2023-08-01', '2026-05-18 15:30', 'tax-manager'],
            ['bagong-araw', 'Bagong Araw Consulting', null, '000-110-210-00000', 'PARTNERSHIP', 'Professional services', 'Mandaluyong', 'NON_VAT', 'BIR_CERTIFICATE', '2022-01-10', '2026-06-02 10:25', 'tax-manager'],
            ['mindanao-fresh', 'Mindanao Fresh Produce Trading', null, '000-111-211-00000', 'SOLE_PROPRIETORSHIP', 'Agricultural trading', 'General Santos', 'NON_VAT', 'USER_ENTERED', '2024-05-20', '2026-07-08 11:50', 'tax-manager'],
            ['siargao-surf', 'Siargao Surf Supply Co.', 'Cloud Nine Surf Supply', '000-112-212-00000', 'CORPORATION', 'Sporting goods retail', 'Surigao City', 'VAT_REGISTERED', 'USER_ENTERED', '2025-04-01', '2026-08-19 14:05', 'owner'],
        ];

        foreach ($taxpayers as [$key, $legal, $trade, $tin, $entity, $industry, $city, $vat, $source, $effective, $createdOn, $actor]) {
            $this->at($createdOn, fn () => $this->as($actor, function (User $user) use ($key, $legal, $trade, $tin, $entity, $industry, $city, $vat, $source, $effective) {
                $this->clients[$key] = app(CreateClient::class)->handle(
                    $user,
                    ['legal_name' => $legal, 'trade_name' => $trade, 'taxpayer_identifier' => $tin, 'entity_type' => $entity, 'industry' => $industry],
                    [
                        'fiscal_year_end_month' => 12,
                        'currency' => 'PHP',
                        'business_address' => ['line1' => 'Demo address, not a real location', 'city' => $city],
                        'registration_information' => ['registered_activities' => $industry],
                        'registration_date' => $effective,
                        'notes' => 'Fictional demo taxpayer. Not a real business.',
                    ],
                    ['vat_status' => $vat, 'status_source' => $source, 'effective_from' => $effective],
                    $source === 'BIR_CERTIFICATE' ? $this->placeholder("certificate-{$key}.pdf", $legal) : null,
                );
            }));
        }
    }

    /** Evidenced changes of registered status, recorded by people, never inferred. */
    private function seedRegistrationChanges(): void
    {
        // A NON-VAT taxpayer that formally registered for VAT, with the new certificate.
        $this->at('2026-04-20 10:30', fn () => $this->as('tax-manager', fn () => $this->recordChange(
            'kalayaan',
            VatStatus::VatRegistered,
            StatusSource::BirCertificate,
            '2025-02-01',
            'Client registered for VAT with effect from 1 February 2025. Updated Certificate of Registration received and filed.',
            DocumentKind::CertificateOfRegistration,
        )));

        // An administrator correction of a data-entry error, with supporting evidence.
        $this->at('2026-06-10 09:15', fn () => $this->as('admin', fn () => $this->recordChange(
            'bagong-araw',
            VatStatus::VatRegistered,
            StatusSource::AdminOverride,
            '2026-01-01',
            'Correction: the partnership registered for VAT from 1 January 2026 but the change was not captured at the time. Confirmation letter attached.',
            DocumentKind::RegistrationSupporting,
        )));

        // A previously user-entered status verified against the certificate.
        $this->at('2026-07-22 16:40', fn () => $this->as('tax-manager', fn () => $this->recordChange(
            'mabuhay',
            VatStatus::NonVat,
            StatusSource::BirCertificate,
            '2025-06-01',
            'Verified against the Certificate of Registration supplied by the owner; status unchanged, source upgraded from user-entered.',
            DocumentKind::CertificateOfRegistration,
        )));
    }

    private function recordChange(string $key, VatStatus $status, StatusSource $source, string $effective, string $reason, DocumentKind $kind): void
    {
        $client = $this->clients[$key];
        $document = app(StoreDocument::class)->handle($client, $this->placeholder("{$key}-registration-update.pdf", $client->legal_name), $kind);
        app(RecordRegistrationStatus::class)->handle($client, $status, $source, CarbonImmutable::parse($effective), $reason, $document);
    }

    private function seedProfileUpdates(): void
    {
        $updates = [
            ['2026-05-06 11:00', 'tax-manager', 'harbourline', [], ['registration_information' => ['rdo_code' => 'DEMO-RDO-1', 'registered_activities' => 'Wholesale of household goods']]],
            ['2026-05-27 15:10', 'tax-manager', 'pacific-crest', ['industry' => 'Software development and IT services'], []],
            ['2026-06-18 10:45', 'admin', 'isla-verde', [], ['business_address' => ['line1' => 'Demo address, not a real location', 'city' => 'Puerto Princesa', 'province' => 'Palawan']]],
            ['2026-08-03 13:20', 'tax-manager', 'tala', ['trade_name' => 'Tala Wellness'], ['notes' => 'Fictional demo taxpayer. Clinic moved to a larger site in July.']],
            ['2026-09-08 09:35', 'tax-manager', 'luzon-precision', [], ['fiscal_year_end_month' => 6, 'accounting_period' => 'FISCAL']],
        ];

        foreach ($updates as [$when, $actor, $key, $client, $profile]) {
            $this->at($when, fn () => $this->as($actor, fn () => app(UpdateClient::class)->handle($this->clients[$key]->refresh(), $client, $profile)));
        }
    }

    private function seedSupportingDocuments(): void
    {
        $documents = [
            ['2026-05-12 14:00', 'harbourline', 'harbourline-books-of-accounts-registration.pdf'],
            ['2026-06-25 10:20', 'isla-verde', 'isla-verde-partnership-agreement.pdf'],
            ['2026-08-28 11:30', 'pacific-crest', 'pacific-crest-secretary-certificate.pdf'],
        ];

        foreach ($documents as [$when, $key, $name]) {
            $this->at($when, fn () => $this->as('tax-manager', fn () => app(StoreDocument::class)->handle(
                $this->clients[$key],
                $this->placeholder($name, $this->clients[$key]->legal_name),
                DocumentKind::RegistrationSupporting,
                substr($when, 0, 10),
            )));
        }
    }

    /** Preparers, accountants and read-only users only see clients assigned to them. */
    private function seedAssignments(): void
    {
        $plan = [
            'harbourline' => ['tax-preparer-2', 'accountant'],
            'sampaguita' => ['tax-preparer', 'read-only'],
            'bayanihan' => ['tax-preparer', 'read-only'],
            'kalayaan' => ['tax-preparer-2', 'accountant'],
            'mabuhay' => ['tax-preparer'],
            'pacific-crest' => ['tax-preparer-2'],
            'isla-verde' => ['accountant'],
            'tala' => ['tax-preparer'],
            'mindanao-fresh' => ['tax-preparer'],
        ];

        $this->at('2026-09-10 08:30', fn () => $this->as('tax-manager', function () use ($plan) {
            foreach ($plan as $key => $people) {
                app(SyncClientAssignments::class)->handle(
                    $this->clients[$key],
                    array_map(fn (string $person) => $this->users[$person]->getKey(), $people),
                );
            }
        }));
    }

    /** A second fictional firm so the organisation switcher has something to switch to. */
    private function seedSecondOrganization(CreateOrganization $createOrganization): void
    {
        $this->at('2026-07-01 09:00', function () use ($createOrganization) {
            $owner = $this->user('partners-owner', 'Rafael Aquino (Demo Partner)');
            $second = $createOrganization->handle(self::SECOND_ORGANIZATION_NAME, $owner, ['is_demo' => true]);

            // The demo owner also reviews for the second firm.
            $second->memberships()->create([
                'user_id' => $this->users['owner']->getKey(),
                'role_id' => Role::system(SystemRole::Reviewer)->getKey(),
                'status' => MembershipStatus::Active,
            ]);

            $membership = Membership::query()->where('organization_id', $second->getKey())->where('user_id', $owner->getKey())->firstOrFail();
            Auth::setUser($owner);
            app(TenantContext::class)->runAs($second, function () use ($owner) {
                foreach ([
                    ['Visayas Heritage Hotels Inc.', '000-201-301-00000', 'CORPORATION', 'Hospitality', 'VAT_REGISTERED'],
                    ['Laguna Lakeside Crafts', '000-202-302-00000', 'SOLE_PROPRIETORSHIP', 'Handicrafts', 'NON_VAT'],
                ] as [$legal, $tin, $entity, $industry, $vat]) {
                    app(CreateClient::class)->handle(
                        $owner,
                        ['legal_name' => $legal, 'taxpayer_identifier' => $tin, 'entity_type' => $entity, 'industry' => $industry],
                        ['fiscal_year_end_month' => 12, 'currency' => 'PHP', 'notes' => 'Fictional demo taxpayer. Not a real business.'],
                        ['vat_status' => $vat, 'status_source' => 'BIR_CERTIFICATE', 'effective_from' => '2024-01-01'],
                        $this->placeholder('certificate.pdf', $legal),
                    );
                }
            }, $membership);
        });

        // Owner logs back into the main firm by default.
        $this->users['owner']->forceFill(['current_organization_id' => $this->organization->getKey()])->save();
    }

    /** Runs a step as a given demo user inside the main demo firm. */
    private function as(string $key, Closure $callback): mixed
    {
        $user = $this->users[$key];
        $membership = Membership::query()
            ->where('organization_id', $this->organization->getKey())
            ->where('user_id', $user->getKey())
            ->firstOrFail();

        Auth::setUser($user);

        return app(TenantContext::class)->runAs($this->organization, fn () => $callback($user), $membership);
    }

    /** Pins "now" so records and audit events carry realistic historical times. */
    private function at(string $moment, Closure $callback): mixed
    {
        $time = CarbonImmutable::parse($moment, 'Asia/Manila')->utc();
        Carbon::setTestNow($time);
        CarbonImmutable::setTestNow($time);

        return $callback();
    }

    private function placeholder(string $name, string $taxpayer): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            "%PDF-1.4\n% DEMO PLACEHOLDER: not a real BIR document. Fictional taxpayer: {$taxpayer}\n"
        );
    }

    private function user(string $key, string $name): User
    {
        return $this->users[$key] = User::query()->firstOrCreate(
            ['email' => "{$key}@demo.test"],
            ['name' => $name, 'password' => (string) (env('DEMO_PASSWORD') ?: self::PASSWORD)],
        );
    }
}
