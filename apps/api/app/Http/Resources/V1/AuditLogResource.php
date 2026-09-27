<?php

namespace App\Http\Resources\V1;

use App\Domain\Audit\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin AuditLog */
class AuditLogResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $actorName = $this->getAttribute('actor_name');

        return [
            'id' => $this->id,
            'action' => $this->action,
            'actor' => [
                'type' => $this->actor_type,
                'id' => $this->actor_id,
                'name' => $actorName ?? ($this->actor_type === 'system' ? 'System' : 'Unknown'),
            ],
            'entity_type' => $this->entity_type,
            'entity_id' => $this->entity_id,
            'client_id' => $this->client_id,
            'before' => $this->before,
            'after' => $this->after,
            'metadata' => $this->metadata,
            'ip' => $request->user()?->can('settings.manage') ? $this->ip : null,
            'correlation_id' => $this->correlation_id,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
