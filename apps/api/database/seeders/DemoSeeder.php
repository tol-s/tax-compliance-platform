<?php

namespace Database\Seeders;

use App\Application\Clients\Actions\CreateClient;
use App\Application\Tenancy\Actions\CreateOrganization;
use App\Domain\Identity\Enums\SystemRole;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\Enums\MembershipStatus;
use App\Domain\Tenancy\Models\Organization;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Database\Seeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use RuntimeException;

/**
 * Seeds the clearly fictional "Demo Accounting Firm" with one user per system
 * role. Guarded: refuses to run in production or without DEMO_MODE=true.
 * Taxpayers, fixtures and the screening scenario are added in Phase 11.
 */
class DemoSeeder extends Seeder
{
    public const ORGANIZATION_NAME = 'Demo Accounting Firm';

    public const PASSWORD = 'demo-password';

    public function run(CreateOrganization $createOrganization): void
    {
        if (app()->isProduction() || ! config('app.demo_mode')) {
            throw new RuntimeException('DemoSeeder requires DEMO_MODE=true and a non-production environment.');
        }

        if (Organization::query()->where('name', self::ORGANIZATION_NAME)->where('is_demo', true)->exists()) {
            return;
        }

        $owner = $this->user('owner@demo.test', 'Demo Owner');
        $organization = $createOrganization->handle(self::ORGANIZATION_NAME, $owner, ['is_demo' => true]);

        foreach (SystemRole::cases() as $role) {
            if ($role === SystemRole::Owner) {
                continue;
            }

            $user = $this->user(str_replace('_', '-', $role->value).'@demo.test', 'Demo '.$role->label());
            $organization->memberships()->create([
                'user_id' => $user->getKey(),
                'role_id' => Role::system($role)->getKey(),
                'status' => MembershipStatus::Active,
            ]);
            $user->forceFill(['current_organization_id' => $organization->getKey()])->save();
        }

        $this->seedTaxpayers($organization, $owner);
    }

    /**
     * Clearly fictional taxpayers. Identifiers use the reserved 000- prefix and
     * certificates are placeholder text files, not real BIR documents.
     */
    private function seedTaxpayers(Organization $organization, User $owner): void
    {
        $taxpayers = [
            ['Demo Harbour Trading Corp', 'Harbour Trading', '000-111-222-00000', 'CORPORATION', 'Wholesale trade', 'VAT_REGISTERED'],
            ['Demo Sampaguita Design Studio', 'Sampaguita Studio', '000-333-444-00000', 'SOLE_PROPRIETORSHIP', 'Creative services', 'NON_VAT'],
            ['Demo Bayanihan Cooperative', null, '000-555-666-00000', 'COOPERATIVE', 'Agriculture', 'NON_VAT'],
        ];

        $membership = $organization->memberships()->where('user_id', $owner->getKey())->firstOrFail();
        Auth::setUser($owner);

        app(TenantContext::class)->runAs($organization, function () use ($taxpayers, $owner) {
            foreach ($taxpayers as [$legal, $trade, $tin, $entity, $industry, $vat]) {
                $certificate = UploadedFile::fake()->createWithContent(
                    'demo-certificate.pdf',
                    "%PDF-1.4\n% DEMO PLACEHOLDER: not a real BIR Certificate of Registration ({$legal})\n"
                );
                app(CreateClient::class)->handle(
                    $owner,
                    ['legal_name' => $legal, 'trade_name' => $trade, 'taxpayer_identifier' => $tin, 'entity_type' => $entity, 'industry' => $industry],
                    ['fiscal_year_end_month' => 12, 'currency' => 'PHP', 'business_address' => ['city' => 'Demo City'], 'notes' => 'Fictional demo taxpayer.'],
                    ['vat_status' => $vat, 'status_source' => 'BIR_CERTIFICATE', 'effective_from' => '2025-01-01'],
                    $certificate,
                );
            }
        }, $membership);
    }

    private function user(string $email, string $name): User
    {
        return User::query()->firstOrCreate(
            ['email' => $email],
            ['name' => $name, 'password' => self::PASSWORD],
        );
    }
}
