<?php

namespace App\Http\Resources\V1;

use App\Domain\Clients\Models\TaxpayerProfile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin TaxpayerProfile */
class TaxpayerProfileResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'jurisdiction_code' => $this->jurisdiction_code,
            'business_address' => (object) ($this->business_address ?? []),
            'registration_information' => (object) ($this->registration_information ?? []),
            'registration_date' => $this->registration_date?->toDateString(),
            'fiscal_year_end_month' => $this->fiscal_year_end_month,
            'accounting_period' => $this->accounting_period,
            'currency' => $this->currency,
            'notes' => $this->notes,
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
