<?php

namespace App\Http\Resources\V1;

use App\Domain\Tenancy\Models\Membership;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Membership */
class MemberResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status->value,
            'role' => ['key' => $this->role->key, 'name' => $this->role->name, 'sees_all_clients' => $this->role->sees_all_clients],
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'mfa_enabled' => $this->user->mfa_enabled_at !== null,
                'last_login_at' => $this->user->last_login_at?->toIso8601String(),
            ],
            'is_self' => $this->user_id === $request->user()?->getKey(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
