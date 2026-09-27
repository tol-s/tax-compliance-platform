<?php

namespace Database\Seeders;

use App\Application\Tenancy\Actions\CreateOrganization;
use App\Domain\Identity\Enums\SystemRole;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\Enums\MembershipStatus;
use App\Domain\Tenancy\Models\Organization;
use Illuminate\Database\Seeder;
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
    }

    private function user(string $email, string $name): User
    {
        return User::query()->firstOrCreate(
            ['email' => $email],
            ['name' => $name, 'password' => self::PASSWORD],
        );
    }
}
