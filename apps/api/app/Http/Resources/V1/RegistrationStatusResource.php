<?php

namespace App\Http\Resources\V1;

use App\Domain\Clients\Models\TaxRegistrationStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin TaxRegistrationStatus */
class RegistrationStatusResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'vat_status' => $this->vat_status->value,
            'vat_status_label' => $this->vat_status->label(),
            'status_source' => $this->status_source->value,
            'status_source_label' => $this->status_source->label(),
            'effective_from' => $this->effective_from->toDateString(),
            'effective_to' => $this->effective_to?->toDateString(),
            'is_current' => $this->effective_to === null,
            'verified' => $this->source_document_id !== null,
            'last_verified_at' => $this->last_verified_at?->toIso8601String(),
            'reason' => $this->reason,
            'source_document' => $this->whenLoaded('sourceDocument', fn () => $this->sourceDocument ? new DocumentResource($this->sourceDocument) : null),
            'created_by' => $this->whenLoaded('creator', fn () => $this->creator ? ['id' => $this->creator->id, 'name' => $this->creator->name] : null),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
