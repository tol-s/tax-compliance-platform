<?php

namespace App\Http\Resources\V1;

use App\Domain\Identity\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Role */
class RoleResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'key' => $this->key,
            'name' => $this->name,
            'is_system' => $this->is_system,
            'sees_all_clients' => $this->sees_all_clients,
            'permissions' => $this->permissions->pluck('key')->sort()->values(),
        ];
    }
}
