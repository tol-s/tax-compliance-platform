<?php

namespace App\Domain\Identity\Models;

use App\Domain\Identity\Enums\SystemRole;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * A role groups permissions. System roles (organization_id = null) are shared
 * by all tenants and synchronised from the SystemRole enum.
 */
#[Fillable(['organization_id', 'key', 'name', 'description', 'is_system', 'sees_all_clients'])]
class Role extends Model
{
    use HasUuids;

    protected function casts(): array
    {
        return ['is_system' => 'boolean', 'sees_all_clients' => 'boolean'];
    }

    /** @return BelongsToMany<Permission, $this> */
    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class);
    }

    public static function system(SystemRole $role): self
    {
        return static::query()->whereNull('organization_id')->where('key', $role->value)->firstOrFail();
    }
}
