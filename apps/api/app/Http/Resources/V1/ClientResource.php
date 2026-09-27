<?php

namespace App\Http\Resources\V1;

use App\Domain\Clients\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The full taxpayer identifier is only returned to users who may view the
 * tax profile; everyone else receives the masked form.
 *
 * @mixin Client
 */
class ClientResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $canSeeIdentifier = (bool) $request->user()?->can('tax_profile.view');

        return [
            'id' => $this->id,
            'legal_name' => $this->legal_name,
            'trade_name' => $this->trade_name,
            'taxpayer_identifier' => $canSeeIdentifier ? $this->taxpayer_identifier : $this->maskedTaxpayerIdentifier(),
            'taxpayer_identifier_masked' => ! $canSeeIdentifier,
            'entity_type' => $this->entity_type->value,
            'entity_type_label' => $this->entity_type->label(),
            'industry' => $this->industry,
            'status' => $this->status->value,
            'current_registration' => $this->whenLoaded('currentRegistration', fn () => $this->currentRegistration
                ? new RegistrationStatusResource($this->currentRegistration)
                : null),
            'profile' => $this->whenLoaded('profile', fn () => $this->profile ? new TaxpayerProfileResource($this->profile) : null),
            'accounting_connections' => [],
            'current_tax_period' => null,
            'assigned_users' => $this->whenLoaded('assignedUsers', fn () => $this->assignedUsers
                ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'email' => $u->email])->values()),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
