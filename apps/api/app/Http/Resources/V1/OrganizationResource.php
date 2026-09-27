<?php

namespace App\Http\Resources\V1;

use App\Domain\Tenancy\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Organization */
class OrganizationResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'country_code' => $this->country_code,
            'base_currency' => $this->base_currency,
            'is_demo' => $this->is_demo,
        ];
    }
}
