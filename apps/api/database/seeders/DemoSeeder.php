<?php

namespace Database\Seeders;

use App\Application\Audit\AuditLogger;
use App\Application\Clients\Actions\CreateClient;
use App\Application\Clients\Actions\RecordRegistrationStatus;
use App\Application\Clients\Actions\SyncClientAssignments;
use App\Application\Clients\Actions\UpdateClient;
use App\Application\Documents\Actions\StoreDocument;
use App\Application\Identity\Actions\UpdateMember;
use App\Application\Tenancy\Actions\CreateOrganization;
use App\Domain\Clients\Enums\StatusSource;
use App\Domain\Clients\Enums\VatStatus;
use App\Domain\Clients\Models\Client;
use App\Domain\Documents\Enums\DocumentKind;
use App\Domain\Documents\Models\Document;
use App\Domain\Identity\Enums\SystemRole;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\Enums\MembershipStatus;
use App\Domain\Tenancy\Models\Membership;
use App\Domain\Tenancy\Models\Organization;
use App\Domain\Tenancy\TenantContext;
use App\Support\CorrelationId;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Database\Seeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use RuntimeException;

/**
 * Seeds a staging environment with a year of activity:
 *
 * - "Demo Accounting Firm" with one user per system role (plus a second
 *   preparer and a member suspended mid-year), and a second firm to show
 *   organisation switching.
 * - Twenty-four test taxpayers covering VAT and non-VAT registrations, verified
 *   and unverified sources, evidenced changes and an administrator correction.
 * - Twelve months of work by every role: assignments, profile edits, document
 *   uploads and downloads, sign-ins and a membership change.
 *
 * Everything is written through the real application actions (or, for sign-ins
 * and downloads, the same audit calls the controllers make), so the audit trail
 * and analytics are exactly what the product would record. Every taxpayer
 * identifier uses the reserved 000- prefix, every certificate is a placeholder
 * file, and the organisations are flagged is_demo so the UI shows the staging
 * banner. No tax rule, rate or threshold is created here.
 *
 * Guarded: refuses to run in production or without DEMO_MODE=true.
 */
class DemoSeeder extends Seeder
{
    public const ORGANIZATION_NAME = 'Demo Accounting Firm';

    public const SECOND_ORGANIZATION_NAME = 'Demo Audit Partners';

    /** Local default only. Deployed environments must set DEMO_PASSWORD to something private. */
    public const PASSWORD = 'demo-password';

    /** The last day of seeded activity. Nothing is recorded after it. */
    private const LAST_DAY = '2026-09-25';

    private const NOTE = 'Staging record. Not a real business.';

    /** @var array<string, User> */
    private array $users = [];

    /** @var array<string, Client> */
    private array $clients = [];

    /** @var array<string, string> Client key to its creation time. */
    private array $createdAt = [];

    private Organization $organization;

    public function run(CreateOrganization $createOrganization): void
    {
        if (app()->isProduction() || ! config('app.demo_mode')) {
            throw new RuntimeException('DemoSeeder requires DEMO_MODE=true and a non-production environment.');
        }

        if (Organization::query()->where('name', self::ORGANIZATION_NAME)->where('is_demo', true)->exists()) {
            return;
        }

        // Fixed seed: the same staging data on every run.
        mt_srand(20251001);

        try {
            $this->at('2025-10-01 09:00', function () use ($createOrganization) {
                $owner = $this->user('owner', 'Maria Santos (Demo Owner)');
                $this->organization = $createOrganization->handle(self::ORGANIZATION_NAME, $owner, ['is_demo' => true]);
                $this->seedMembers();
            });

            $this->seedTaxpayers();
            $this->seedAssignments();
            $this->seedRegistrationChanges();
            $this->seedProfileUpdates();
            $this->seedSupportingDocuments();
            $this->seedMembershipChange();
            $this->seedDownloads();
            $this->seedSecondOrganization($createOrganization);
            $this->seedSignIns();
        } finally {
            Carbon::setTestNow();
            CarbonImmutable::setTestNow();
            Auth::forgetUser();
        }
    }

    private function seedMembers(): void
    {
        $people = [
            ['admin', 'Jose Reyes (Demo Admin)', SystemRole::Admin],
            ['tax-manager', 'Ana Cruz (Demo Tax Manager)', SystemRole::TaxManager],
            ['tax-preparer', 'Paolo Garcia (Demo Tax Preparer)', SystemRole::TaxPreparer],
            ['tax-preparer-2', 'Bea Mendoza (Demo Tax Preparer)', SystemRole::TaxPreparer],
            ['reviewer', 'Carlo Villanueva (Demo Reviewer)', SystemRole::Reviewer],
            ['accountant', 'Liza Ramos (Demo Accountant)', SystemRole::Accountant],
            ['read-only', 'Miguel Torres (Demo Read Only)', SystemRole::ReadOnly],
            ['former-staff', 'Nina Flores (Demo, suspended)', SystemRole::TaxPreparer],
        ];

        foreach ($people as [$key, $name, $role]) {
            $user = $this->user($key, $name);
            $this->organization->memberships()->create([
                'user_id' => $user->getKey(),
                'role_id' => Role::system($role)->getKey(),
                'status' => MembershipStatus::Active,
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
            ['harbourline', 'Harbourline Trading Corporation', 'Harbourline', '000-101-201-00000', 'CORPORATION', 'Wholesale trade', 'Makati City', 'VAT_REGISTERED', 'BIR_CERTIFICATE', '2023-01-02', '2025-10-06 10:15', 'tax-manager'],
            ['sampaguita', 'Sampaguita Design Studio', 'Sampaguita Studio', '000-102-202-00000', 'SOLE_PROPRIETORSHIP', 'Creative services', 'Quezon City', 'NON_VAT', 'BIR_CERTIFICATE', '2024-03-01', '2025-10-14 14:40', 'tax-manager'],
            ['bayanihan', 'Bayanihan Farmers Cooperative', null, '000-103-203-00000', 'COOPERATIVE', 'Agriculture', 'Tarlac City', 'NON_VAT', 'BIR_CERTIFICATE', '2021-06-15', '2025-11-04 09:30', 'tax-manager'],
            ['kalayaan', 'Kalayaan Logistics Inc.', 'Kalayaan Express', '000-104-204-00000', 'CORPORATION', 'Logistics', 'Pasig City', 'NON_VAT', 'BIR_CERTIFICATE', '2022-07-01', '2025-11-19 11:05', 'tax-manager'],
            ['mabuhay', 'Mabuhay Bakeshop', null, '000-105-205-00000', 'SOLE_PROPRIETORSHIP', 'Food retail', 'Cebu City', 'NON_VAT', 'USER_ENTERED', '2025-01-06', '2025-12-02 16:20', 'owner'],
            ['pacific-crest', 'Pacific Crest Software Solutions Inc.', 'Pacific Crest', '000-106-206-00000', 'CORPORATION', 'IT services', 'Taguig City', 'VAT_REGISTERED', 'BIR_CERTIFICATE', '2020-09-01', '2025-12-10 10:00', 'tax-manager'],
            ['isla-verde', 'Isla Verde Resort Partnership', 'Isla Verde Resort', '000-107-207-00000', 'PARTNERSHIP', 'Hospitality', 'Puerto Princesa', 'VAT_REGISTERED', 'BIR_CERTIFICATE', '2019-11-04', '2026-01-12 13:45', 'tax-manager'],
            ['luzon-precision', 'Luzon Precision Engineering Corp.', 'LPE', '000-108-208-00000', 'CORPORATION', 'Manufacturing', 'Calamba', 'VAT_REGISTERED', 'BIR_CERTIFICATE', '2018-02-19', '2026-01-26 09:10', 'admin'],
            ['tala', 'Tala Wellness Clinic', null, '000-109-209-00000', 'SOLE_PROPRIETORSHIP', 'Healthcare', 'Davao City', 'NON_VAT', 'BIR_CERTIFICATE', '2023-08-01', '2026-02-03 15:30', 'tax-manager'],
            ['maharlika', 'Maharlika Builders Inc.', 'Maharlika Builders', '000-113-213-00000', 'CORPORATION', 'Construction', 'Quezon City', 'VAT_REGISTERED', 'BIR_CERTIFICATE', '2017-06-12', '2026-02-17 10:40', 'tax-manager'],
            ['bagong-araw', 'Bagong Araw Consulting', null, '000-110-210-00000', 'PARTNERSHIP', 'Professional services', 'Mandaluyong', 'NON_VAT', 'BIR_CERTIFICATE', '2022-01-10', '2026-03-04 10:25', 'tax-manager'],
            ['bukid', 'Bukid Agri Supplies Corp.', 'Bukid Agri', '000-114-214-00000', 'CORPORATION', 'Agricultural supplies', 'Iloilo City', 'VAT_REGISTERED', 'BIR_CERTIFICATE', '2021-03-15', '2026-03-18 14:10', 'admin'],
            ['lakbay', 'Lakbay Travel and Tours', 'Lakbay Tours', '000-115-215-00000', 'SOLE_PROPRIETORSHIP', 'Travel services', 'Baguio City', 'NON_VAT', 'BIR_CERTIFICATE', '2023-02-01', '2026-03-25 11:00', 'tax-manager'],
            ['mindanao-fresh', 'Mindanao Fresh Produce Trading', null, '000-111-211-00000', 'SOLE_PROPRIETORSHIP', 'Agricultural trading', 'General Santos', 'NON_VAT', 'USER_ENTERED', '2024-05-20', '2026-04-08 11:50', 'tax-manager'],
            ['liwanag', 'Liwanag Solar Energy Corp.', 'Liwanag Solar', '000-116-216-00000', 'CORPORATION', 'Renewable energy', 'Batangas City', 'VAT_REGISTERED', 'BIR_CERTIFICATE', '2022-11-07', '2026-04-22 09:45', 'tax-manager'],
            ['dagat', 'Dagat Seafoods Trading', null, '000-117-217-00000', 'SOLE_PROPRIETORSHIP', 'Seafood trading', 'Zamboanga City', 'NON_VAT', 'USER_ENTERED', '2024-09-02', '2026-05-06 15:15', 'owner'],
            ['habi', 'Habi Textiles Cooperative', null, '000-118-218-00000', 'COOPERATIVE', 'Textiles', 'Vigan City', 'NON_VAT', 'BIR_CERTIFICATE', '2020-08-20', '2026-05-20 10:05', 'tax-manager'],
            ['kapihan', 'Kapihan sa Kanto', null, '000-119-219-00000', 'SOLE_PROPRIETORSHIP', 'Food service', 'Iloilo City', 'NON_VAT', 'BIR_CERTIFICATE', '2025-02-14', '2026-06-03 13:30', 'tax-manager'],
            ['tanglaw', 'Tanglaw Learning Center', 'Tanglaw', '000-120-220-00000', 'PARTNERSHIP', 'Education', 'Cagayan de Oro', 'NON_VAT', 'BIR_CERTIFICATE', '2021-06-01', '2026-06-17 09:20', 'admin'],
            ['pinnacle', 'Pinnacle Health Diagnostics Inc.', 'Pinnacle Diagnostics', '000-121-221-00000', 'CORPORATION', 'Healthcare', 'Makati City', 'VAT_REGISTERED', 'BIR_CERTIFICATE', '2019-04-08', '2026-07-01 10:30', 'tax-manager'],
            ['sinag', 'Sinag Media Productions', 'Sinag Media', '000-122-222-00000', 'PARTNERSHIP', 'Media production', 'Pasay City', 'VAT_REGISTERED', 'USER_ENTERED', '2024-01-15', '2026-07-15 16:00', 'tax-manager'],
            ['siargao-surf', 'Siargao Surf Supply Co.', 'Cloud Nine Surf Supply', '000-112-212-00000', 'CORPORATION', 'Sporting goods retail', 'Surigao City', 'VAT_REGISTERED', 'USER_ENTERED', '2025-04-01', '2026-08-05 14:05', 'owner'],
            ['bahay-kubo', 'Bahay Kubo Home Furnishings', null, '000-123-223-00000', 'SOLE_PROPRIETORSHIP', 'Furniture retail', 'San Fernando', 'NON_VAT', 'BIR_CERTIFICATE', '2023-10-02', '2026-08-19 11:40', 'tax-manager'],
            ['alon', 'Alon Marine Services Corp.', 'Alon Marine', '000-124-224-00000', 'CORPORATION', 'Marine services', 'Olongapo City', 'VAT_REGISTERED', 'BIR_CERTIFICATE', '2018-09-17', '2026-09-09 10:50', 'tax-manager'],
        ];

        foreach ($taxpayers as [$key, $legal, $trade, $tin, $entity, $industry, $city, $vat, $source, $effective, $createdOn, $actor]) {
            $this->createdAt[$key] = $createdOn;
            $this->at($createdOn, fn () => $this->as($actor, function (User $user) use ($key, $legal, $trade, $tin, $entity, $industry, $city, $vat, $source, $effective) {
                $this->clients[$key] = app(CreateClient::class)->handle(
                    $user,
                    ['legal_name' => $legal, 'trade_name' => $trade, 'taxpayer_identifier' => $tin, 'entity_type' => $entity, 'industry' => $industry],
                    [
                        'fiscal_year_end_month' => 12,
                        'currency' => 'PHP',
                        'business_address' => ['line1' => 'Staging address, not a real location', 'city' => $city],
                        'registration_information' => ['registered_activities' => $industry],
                        'registration_date' => $effective,
                        'notes' => self::NOTE,
                    ],
                    ['vat_status' => $vat, 'status_source' => $source, 'effective_from' => $effective],
                    $source === 'BIR_CERTIFICATE' ? $this->placeholder("certificate-{$key}.pdf", $legal) : null,
                );
            }));
        }
    }

    /**
     * Preparers, accountants and read-only users only see clients assigned to them.
     * Each client is assigned by the tax manager the working day after it is added.
     */
    private function seedAssignments(): void
    {
        $plan = [
            'harbourline' => ['tax-preparer-2', 'accountant'],
            'sampaguita' => ['tax-preparer', 'read-only'],
            'bayanihan' => ['tax-preparer', 'read-only'],
            'kalayaan' => ['tax-preparer-2', 'accountant'],
            'mabuhay' => ['tax-preparer'],
            'pacific-crest' => ['tax-preparer-2'],
            'isla-verde' => ['accountant', 'former-staff'],
            'luzon-precision' => ['former-staff'],
            'tala' => ['tax-preparer'],
            'maharlika' => ['tax-preparer-2'],
            'bukid' => ['accountant'],
            'lakbay' => ['tax-preparer', 'read-only'],
            'mindanao-fresh' => ['tax-preparer'],
            'liwanag' => ['tax-preparer-2', 'accountant'],
            'dagat' => ['tax-preparer'],
            'habi' => ['accountant', 'read-only'],
            'kapihan' => ['tax-preparer'],
            'tanglaw' => ['read-only'],
            'pinnacle' => ['tax-preparer-2'],
            'sinag' => ['tax-preparer-2'],
            'siargao-surf' => ['tax-preparer', 'accountant'],
            'bahay-kubo' => ['tax-preparer'],
            'alon' => ['tax-preparer-2'],
        ];

        foreach ($plan as $key => $people) {
            $this->at($this->nextWorkingDay($this->createdAt[$key], '08:45'), fn () => $this->as('tax-manager', fn () => app(SyncClientAssignments::class)->handle(
                $this->clients[$key],
                array_map(fn (string $person) => $this->users[$person]->getKey(), $people),
            )));
        }

        // Work is rebalanced once the suspended member leaves.
        $this->at('2026-07-01 08:30', fn () => $this->as('tax-manager', function () {
            app(SyncClientAssignments::class)->handle($this->clients['isla-verde'], [$this->users['accountant']->getKey(), $this->users['tax-preparer-2']->getKey()]);
            app(SyncClientAssignments::class)->handle($this->clients['luzon-precision'], [$this->users['tax-preparer']->getKey()]);
        }));
    }

    /** Evidenced changes of registered status, recorded by people, never inferred. */
    private function seedRegistrationChanges(): void
    {
        $changes = [
            ['2026-01-20 10:30', 'tax-manager', 'kalayaan', VatStatus::VatRegistered, StatusSource::BirCertificate, '2025-02-01', 'Client registered for VAT with effect from 1 February 2025. Updated Certificate of Registration received and filed.', DocumentKind::CertificateOfRegistration],
            ['2026-02-11 16:40', 'tax-manager', 'mabuhay', VatStatus::NonVat, StatusSource::BirCertificate, '2025-06-01', 'Verified against the Certificate of Registration supplied by the owner; status unchanged, source upgraded from user-entered.', DocumentKind::CertificateOfRegistration],
            ['2026-03-09 11:20', 'tax-manager', 'sampaguita', VatStatus::VatRegistered, StatusSource::BirCertificate, '2026-03-01', 'Studio registered for VAT from 1 March 2026. New Certificate of Registration attached.', DocumentKind::CertificateOfRegistration],
            ['2026-04-10 09:15', 'admin', 'bagong-araw', VatStatus::VatRegistered, StatusSource::AdminOverride, '2026-01-01', 'Correction: the partnership registered for VAT from 1 January 2026 but the change was not captured at the time. Confirmation letter attached.', DocumentKind::RegistrationSupporting],
            ['2026-05-14 14:05', 'tax-manager', 'mindanao-fresh', VatStatus::NonVat, StatusSource::BirCertificate, '2025-01-01', 'Certificate of Registration received; the user-entered status is now verified.', DocumentKind::CertificateOfRegistration],
            ['2026-07-08 10:50', 'tax-manager', 'lakbay', VatStatus::VatRegistered, StatusSource::BirCertificate, '2026-07-01', 'Registered for VAT from 1 July 2026. Updated certificate filed.', DocumentKind::CertificateOfRegistration],
            ['2026-08-26 15:25', 'tax-manager', 'siargao-surf', VatStatus::VatRegistered, StatusSource::BirCertificate, '2025-07-01', 'Certificate of Registration received; effective date corrected to 1 July 2025 as shown on the certificate.', DocumentKind::CertificateOfRegistration],
        ];

        foreach ($changes as [$when, $actor, $key, $status, $source, $effective, $reason, $kind]) {
            $this->at($when, fn () => $this->as($actor, function () use ($key, $status, $source, $effective, $reason, $kind) {
                $client = $this->clients[$key];
                $document = app(StoreDocument::class)->handle($client, $this->placeholder("{$key}-registration-update.pdf", $client->legal_name), $kind);
                app(RecordRegistrationStatus::class)->handle($client, $status, $source, CarbonImmutable::parse($effective), $reason, $document);
            }));
        }
    }

    /** Tax profile edits by people with tax_profile.edit; client detail edits by assigned preparers. */
    private function seedProfileUpdates(): void
    {
        $updates = [
            ['2025-11-12 11:00', 'tax-manager', 'harbourline', [], ['registration_information' => ['rdo_code' => 'STAGING-RDO-1', 'registered_activities' => 'Wholesale of household goods']]],
            ['2026-01-15 15:10', 'tax-preparer-2', 'pacific-crest', ['industry' => 'Software development and IT services'], []],
            ['2026-02-18 10:45', 'admin', 'isla-verde', [], ['business_address' => ['line1' => 'Staging address, not a real location', 'city' => 'Puerto Princesa', 'province' => 'Palawan']]],
            ['2026-03-05 14:30', 'tax-preparer', 'bayanihan', ['trade_name' => 'Bayanihan Co-op'], []],
            ['2026-04-16 13:20', 'tax-preparer', 'tala', ['trade_name' => 'Tala Wellness'], []],
            ['2026-05-12 09:35', 'tax-manager', 'luzon-precision', [], ['fiscal_year_end_month' => 6, 'accounting_period' => 'FISCAL']],
            ['2026-06-23 16:05', 'tax-preparer-2', 'maharlika', ['industry' => 'General construction'], []],
            ['2026-07-21 11:15', 'tax-manager', 'tala', [], ['notes' => 'Staging record. Clinic moved to a larger site in July.']],
            ['2026-08-12 10:10', 'tax-preparer', 'kapihan', ['trade_name' => 'Kapihan'], []],
            ['2026-09-15 14:50', 'tax-preparer-2', 'alon', ['industry' => 'Marine and port services'], []],
            ['2026-09-22 09:40', 'tax-manager', 'habi', [], ['registration_information' => ['rdo_code' => 'STAGING-RDO-2', 'registered_activities' => 'Textiles']]],
        ];

        foreach ($updates as [$when, $actor, $key, $client, $profile]) {
            $this->at($when, fn () => $this->as($actor, fn () => app(UpdateClient::class)->handle($this->clients[$key]->refresh(), $client, $profile)));
        }
    }

    private function seedSupportingDocuments(): void
    {
        $documents = [
            ['2025-11-12 14:00', 'tax-manager', 'harbourline', 'harbourline-books-of-accounts-registration.pdf'],
            ['2026-01-28 10:20', 'tax-manager', 'isla-verde', 'isla-verde-partnership-agreement.pdf'],
            ['2026-02-24 11:30', 'tax-manager', 'pacific-crest', 'pacific-crest-secretary-certificate.pdf'],
            ['2026-03-11 15:45', 'admin', 'maharlika', 'maharlika-mayors-permit.pdf'],
            ['2026-04-29 09:50', 'tax-manager', 'bukid', 'bukid-books-of-accounts-registration.pdf'],
            ['2026-05-27 13:15', 'tax-manager', 'liwanag', 'liwanag-secretary-certificate.pdf'],
            ['2026-06-24 10:40', 'admin', 'habi', 'habi-cooperative-registration.pdf'],
            ['2026-07-09 14:25', 'tax-manager', 'pinnacle', 'pinnacle-mayors-permit.pdf'],
            ['2026-08-13 11:05', 'tax-manager', 'tanglaw', 'tanglaw-partnership-agreement.pdf'],
            ['2026-09-16 16:10', 'tax-manager', 'alon', 'alon-books-of-accounts-registration.pdf'],
        ];

        foreach ($documents as [$when, $actor, $key, $name]) {
            $this->at($when, fn () => $this->as($actor, fn () => app(StoreDocument::class)->handle(
                $this->clients[$key],
                $this->placeholder($name, $this->clients[$key]->legal_name),
                DocumentKind::RegistrationSupporting,
                substr($when, 0, 10),
            )));
        }
    }

    /** A preparer leaves mid-year: an administrator suspends their access. */
    private function seedMembershipChange(): void
    {
        $this->at('2026-06-30 17:00', fn () => $this->as('admin', function (User $admin) {
            $membership = Membership::query()
                ->where('organization_id', $this->organization->getKey())
                ->where('user_id', $this->users['former-staff']->getKey())
                ->firstOrFail();

            app(UpdateMember::class)->handle($admin, $membership, null, MembershipStatus::Suspended);
        }));
    }

    /**
     * Evidence is opened by reviewers, accountants and read-only members as part
     * of their work. Recorded exactly as the download endpoint records it.
     */
    private function seedDownloads(): void
    {
        $readers = [
            'reviewer' => null,
            'accountant' => ['harbourline', 'kalayaan', 'isla-verde', 'bukid', 'liwanag', 'habi', 'siargao-surf'],
            'read-only' => ['sampaguita', 'bayanihan', 'lakbay', 'habi', 'tanglaw'],
            'tax-preparer' => ['sampaguita', 'bayanihan', 'mabuhay', 'tala', 'lakbay', 'mindanao-fresh', 'kapihan', 'bahay-kubo'],
            'tax-preparer-2' => ['harbourline', 'kalayaan', 'pacific-crest', 'maharlika', 'liwanag', 'pinnacle', 'alon'],
        ];

        foreach ($readers as $reader => $keys) {
            foreach ($keys ?? array_keys($this->clients) as $key) {
                $documents = Document::query()->withoutGlobalScopes()->where('client_id', $this->clients[$key]->getKey())->orderBy('created_at')->get();
                $opens = $reader === 'reviewer' ? 1 : mt_rand(1, 2);

                foreach ($this->pick($documents->all(), $opens) as $document) {
                    $when = $this->randomMomentAfter(max($this->createdAt[$key], $document->created_at->timezone('Asia/Manila')->format('Y-m-d H:i')), 60);
                    if ($when === null) {
                        continue;
                    }

                    $this->at($when, fn () => $this->as($reader, fn () => app(AuditLogger::class)->record(
                        'document.downloaded',
                        $document,
                        metadata: ['sha256' => $document->sha256],
                        clientId: $document->client_id,
                    )));
                }
            }
        }
    }

    /**
     * Sign-ins through the year, recorded as the login action records them.
     * A suspended member stops signing in when access is removed.
     */
    private function seedSignIns(): void
    {
        $perMonth = [
            'owner' => 2, 'admin' => 2, 'tax-manager' => 4, 'tax-preparer' => 3, 'tax-preparer-2' => 3,
            'reviewer' => 2, 'accountant' => 2, 'read-only' => 1, 'former-staff' => 2, 'partners-owner' => 2,
        ];
        $until = ['former-staff' => '2026-06-30'];
        $from = ['partners-owner' => '2026-07-01'];

        foreach ($perMonth as $key => $count) {
            $month = CarbonImmutable::parse($from[$key] ?? '2025-10-01', 'Asia/Manila')->startOfMonth();
            $last = CarbonImmutable::parse($until[$key] ?? self::LAST_DAY, 'Asia/Manila');
            $moments = [];

            while ($month->lessThanOrEqualTo($last)) {
                for ($i = 0; $i < $count; $i++) {
                    $day = $month->addDays(mt_rand(0, $month->daysInMonth - 1));
                    if ($day->isWeekend()) {
                        $day = $day->next(CarbonImmutable::MONDAY);
                    }
                    $moment = $day->setTime(mt_rand(7, 10), mt_rand(0, 59));
                    if ($moment->lessThan(CarbonImmutable::parse($from[$key] ?? '2025-10-01 09:30', 'Asia/Manila')) || $moment->greaterThan($last->endOfDay())) {
                        continue;
                    }
                    $moments[] = $moment->format('Y-m-d H:i');
                }
                $month = $month->addMonth();
            }

            sort($moments);
            foreach (array_unique($moments) as $moment) {
                $this->at($moment, fn () => $this->signIn($key));
            }
        }
    }

    /** Mirrors LoginUser: last sign-in time, then the auth.login event. No token is issued. */
    private function signIn(string $key): void
    {
        $user = $this->users[$key]->refresh();
        // Sign-ins are only seeded while the membership was active, so look it up
        // regardless of its status today (a member may have been suspended since).
        $membership = Membership::query()
            ->where('organization_id', $user->current_organization_id)
            ->where('user_id', $user->getKey())
            ->first();

        $user->forceFill(['last_login_at' => now()])->save();
        app(AuditLogger::class)->record('auth.login', $user, actor: $user, organizationId: $membership?->organization_id);
    }

    /** A second firm so the organisation switcher has something to switch to. */
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
        });

        $second = Organization::query()->where('name', self::SECOND_ORGANIZATION_NAME)->firstOrFail();
        $owner = $this->users['partners-owner'];
        $membership = Membership::query()->where('organization_id', $second->getKey())->where('user_id', $owner->getKey())->firstOrFail();

        foreach ([
            ['2026-07-01 09:30', 'Visayas Heritage Hotels Inc.', '000-201-301-00000', 'CORPORATION', 'Hospitality', 'VAT_REGISTERED', 'Cebu City'],
            ['2026-07-01 10:15', 'Laguna Lakeside Crafts', '000-202-302-00000', 'SOLE_PROPRIETORSHIP', 'Handicrafts', 'NON_VAT', 'Los Baños'],
            ['2026-08-04 14:00', 'Cordillera Coffee Roasters', '000-203-303-00000', 'SOLE_PROPRIETORSHIP', 'Food manufacturing', 'NON_VAT', 'La Trinidad'],
            ['2026-09-02 11:20', 'Palawan Pearl Exports Inc.', '000-204-304-00000', 'CORPORATION', 'Export trading', 'VAT_REGISTERED', 'Puerto Princesa'],
        ] as [$when, $legal, $tin, $entity, $industry, $vat, $city]) {
            $this->at($when, function () use ($owner, $second, $membership, $legal, $tin, $entity, $industry, $vat, $city) {
                Auth::setUser($owner);
                app(TenantContext::class)->runAs($second, fn () => app(CreateClient::class)->handle(
                    $owner,
                    ['legal_name' => $legal, 'taxpayer_identifier' => $tin, 'entity_type' => $entity, 'industry' => $industry],
                    [
                        'fiscal_year_end_month' => 12,
                        'currency' => 'PHP',
                        'business_address' => ['line1' => 'Staging address, not a real location', 'city' => $city],
                        'notes' => self::NOTE,
                    ],
                    ['vat_status' => $vat, 'status_source' => 'BIR_CERTIFICATE', 'effective_from' => '2024-01-01'],
                    $this->placeholder('certificate.pdf', $legal),
                ), $membership);
            });
        }

        $owner->forceFill(['current_organization_id' => $second->getKey()])->save();
        // The demo owner signs in to the main firm by default.
        $this->users['owner']->forceFill(['current_organization_id' => $this->organization->getKey()])->save();
    }

    /** Runs a step as a given demo user inside the main demo firm, as its own request. */
    private function as(string $key, Closure $callback): mixed
    {
        $user = $this->users[$key];
        $membership = Membership::query()
            ->where('organization_id', $this->organization->getKey())
            ->where('user_id', $user->getKey())
            ->firstOrFail();

        Auth::setUser($user);
        CorrelationId::set(null);

        return app(TenantContext::class)->runAs($this->organization, fn () => $callback($user), $membership);
    }

    /** Pins "now" so records and audit events carry realistic historical times. */
    private function at(string $moment, Closure $callback): mixed
    {
        $time = CarbonImmutable::parse($moment, 'Asia/Manila')->utc();
        Carbon::setTestNow($time);
        CarbonImmutable::setTestNow($time);
        CorrelationId::set(null);

        return $callback();
    }

    /**
     * Up to $count distinct items, chosen with the seeded generator so every run matches.
     *
     * @template T
     *
     * @param  list<T>  $items
     * @return list<T>
     */
    private function pick(array $items, int $count): array
    {
        $picked = [];
        while ($items !== [] && count($picked) < $count) {
            $index = mt_rand(0, count($items) - 1);
            $picked[] = $items[$index];
            array_splice($items, $index, 1);
        }

        return $picked;
    }

    private function nextWorkingDay(string $moment, string $time): string
    {
        $day = CarbonImmutable::parse($moment, 'Asia/Manila')->addDay();
        while ($day->isWeekend()) {
            $day = $day->addDay();
        }

        return $day->format('Y-m-d').' '.$time;
    }

    /** A weekday working-hours moment within $days after $after, or null if past the last seeded day. */
    private function randomMomentAfter(string $after, int $days): ?string
    {
        $start = CarbonImmutable::parse($after, 'Asia/Manila');
        $moment = $start->addDays(mt_rand(1, $days))->setTime(mt_rand(9, 16), mt_rand(0, 59));
        while ($moment->isWeekend()) {
            $moment = $moment->addDay();
        }

        return $moment->greaterThan(CarbonImmutable::parse(self::LAST_DAY.' 18:00', 'Asia/Manila')) ? null : $moment->format('Y-m-d H:i');
    }

    private function placeholder(string $name, string $taxpayer): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            "%PDF-1.4\n% STAGING PLACEHOLDER: not a real BIR document. Test taxpayer: {$taxpayer}\n"
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
