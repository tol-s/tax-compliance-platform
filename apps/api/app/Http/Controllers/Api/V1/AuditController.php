<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Audit\Models\AuditLog;
use App\Domain\Clients\Models\Client;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\AuditLogResource;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class AuditController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('audit.view');

        return $this->respond($request, $this->query());
    }

    public function forClient(Request $request, Client $client): AnonymousResourceCollection
    {
        Gate::authorize('viewAudit', $client);

        return $this->respond($request, $this->query()->where('audit_logs.client_id', $client->getKey()));
    }

    /** @return Builder<AuditLog> */
    private function query(): Builder
    {
        return AuditLog::query()
            ->leftJoin('users', 'users.id', '=', 'audit_logs.actor_id')
            ->select('audit_logs.*', 'users.name as actor_name');
    }

    /** @param Builder<AuditLog> $query */
    private function respond(Request $request, Builder $query): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'action' => ['nullable', 'string', 'max:64', 'regex:/^[a-z_.]+$/'],
            'entity_type' => ['nullable', 'string', 'max:64'],
            'actor_id' => ['nullable', 'uuid'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $query
            ->when($filters['action'] ?? null, fn (Builder $q, string $a) => $q->where('audit_logs.action', 'like', $a.'%'))
            ->when($filters['entity_type'] ?? null, fn (Builder $q, string $t) => $q->where('audit_logs.entity_type', $t))
            ->when($filters['actor_id'] ?? null, fn (Builder $q, string $id) => $q->where('audit_logs.actor_id', $id))
            ->when($filters['from'] ?? null, fn (Builder $q, string $d) => $q->where('audit_logs.created_at', '>=', $d))
            ->when($filters['to'] ?? null, fn (Builder $q, string $d) => $q->where('audit_logs.created_at', '<', now()->parse($d)->addDay()))
            ->orderByDesc('audit_logs.created_at')
            ->orderByDesc('audit_logs.id');

        return AuditLogResource::collection($query->paginate((int) ($filters['per_page'] ?? 50))->withQueryString());
    }
}
