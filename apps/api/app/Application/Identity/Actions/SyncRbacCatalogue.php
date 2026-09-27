<?php

namespace App\Application\Identity\Actions;

use App\Domain\Identity\Enums\Permission as PermissionEnum;
use App\Domain\Identity\Enums\SystemRole;
use App\Domain\Identity\Models\Permission;
use App\Domain\Identity\Models\Role;
use Illuminate\Support\Facades\DB;

/**
 * Idempotently synchronises the permissions table and system roles from the
 * Permission and SystemRole enums. Safe to run on every deploy.
 */
class SyncRbacCatalogue
{
    public function handle(): void
    {
        DB::transaction(function () {
            foreach (PermissionEnum::cases() as $permission) {
                Permission::query()->updateOrCreate(
                    ['key' => $permission->value],
                    ['group' => $permission->group(), 'description' => $permission->description()],
                );
            }
            Permission::query()->whereNotIn('key', PermissionEnum::values())->delete();

            $ids = Permission::query()->pluck('id', 'key');

            foreach (SystemRole::cases() as $systemRole) {
                $role = Role::query()->firstOrNew(['organization_id' => null, 'key' => $systemRole->value]);
                $role->fill(['name' => $systemRole->label(), 'is_system' => true])->save();

                $role->permissions()->sync(
                    array_map(fn (PermissionEnum $p) => $ids[$p->value], $systemRole->permissions())
                );
            }
        });
    }
}
