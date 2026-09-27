<?php

namespace App\Http\Resources\V1;

use App\Domain\Tenancy\Models\Membership;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Membership */
class MembershipResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status->value,
            'organization' => new OrganizationResource($this->whenLoaded('organization')),
            'role' => $this->whenLoaded('role', fn () => [
                'key' => $this->role->key,
                'name' => $this->role->name,
            ]),
        ];
    }
}
