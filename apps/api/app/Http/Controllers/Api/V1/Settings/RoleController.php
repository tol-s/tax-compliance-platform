<?php

namespace App\Http\Controllers\Api\V1\Settings;

use App\Domain\Identity\Enums\Permission;
use App\Domain\Identity\Enums\SystemRole;
use App\Domain\Identity\Models\Role;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\RoleResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        Gate::authorize('settings.manage');

        $order = array_map(fn ($r) => $r->value, SystemRole::cases());
        $roles = Role::query()->whereNull('organization_id')->with('permissions')->get()
            ->sortBy(fn (Role $r) => array_search($r->key, $order, true))->values();

        return response()->json([
            'data' => RoleResource::collection($roles),
            'permissions' => array_map(fn (Permission $p) => [
                'key' => $p->value, 'group' => $p->group(), 'description' => $p->description(),
            ], Permission::cases()),
        ]);
    }
}
