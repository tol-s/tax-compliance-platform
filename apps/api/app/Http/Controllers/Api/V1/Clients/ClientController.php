<?php

namespace App\Http\Controllers\Api\V1\Clients;

use App\Application\Clients\Actions\CreateClient;
use App\Application\Clients\Actions\UpdateClient;
use App\Application\Clients\ClientAccess;
use App\Domain\Clients\Models\Client;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Clients\StoreClientRequest;
use App\Http\Requests\Api\V1\Clients\UpdateClientRequest;
use App\Http\Resources\V1\ClientResource;
use App\Support\Security\BlindIndex;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Gate;

class ClientController extends Controller
{
    private const SORTABLE = ['legal_name', 'created_at', 'updated_at'];

    /** Server-side search, filtering, sorting and pagination: the browser never receives the full list. */
    public function index(Request $request, ClientAccess $access): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Client::class);
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'vat_status' => ['nullable', 'in:VAT_REGISTERED,NON_VAT'],
            'status' => ['nullable', 'in:ACTIVE,ARCHIVED'],
            'sort' => ['nullable', 'string'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $query = $access->visibleClients($request->user())->with('currentRegistration');

        if ($term = trim((string) ($validated['q'] ?? ''))) {
            $index = BlindIndex::taxpayerIdentifier($term);
            $query->where(function (Builder $q) use ($term, $index) {
                $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term).'%';
                $q->where('legal_name', 'ilike', $like)->orWhere('trade_name', 'ilike', $like);
                if ($index) {
                    $q->orWhere('taxpayer_identifier_index', $index);
                }
            });
        }
        if ($status = $validated['vat_status'] ?? null) {
            $query->whereHas('currentRegistration', fn (Builder $q) => $q->where('vat_status', $status));
        }
        $query->where('status', $validated['status'] ?? 'ACTIVE');

        $sort = (string) ($validated['sort'] ?? 'legal_name');
        $column = ltrim($sort, '-');
        $query->orderBy(in_array($column, self::SORTABLE, true) ? $column : 'legal_name', str_starts_with($sort, '-') ? 'desc' : 'asc')
            ->orderBy('id');

        return ClientResource::collection($query->paginate((int) ($validated['per_page'] ?? 25))->withQueryString());
    }

    public function store(StoreClientRequest $request, CreateClient $create): JsonResponse
    {
        Gate::authorize('create', Client::class);
        $data = $request->validated();

        $client = $create->handle(
            $request->user(),
            Arr::only($data, ['legal_name', 'trade_name', 'taxpayer_identifier', 'entity_type', 'industry']),
            $data['profile'] ?? [],
            $data['registration'],
            $request->file('certificate'),
        );

        return (new ClientResource($client->load(['currentRegistration.sourceDocument', 'profile'])))
            ->response()->setStatusCode(201);
    }

    public function show(Client $client): ClientResource
    {
        Gate::authorize('view', $client);

        return new ClientResource($client->load(['currentRegistration.sourceDocument', 'profile', 'assignedUsers']));
    }

    public function update(UpdateClientRequest $request, Client $client, UpdateClient $update): ClientResource
    {
        Gate::authorize('update', $client);
        $data = $request->validated();

        if (isset($data['profile'])) {
            Gate::authorize('editTaxProfile', $client);
        }

        $client = $update->handle(
            $client,
            Arr::only($data, ['legal_name', 'trade_name', 'taxpayer_identifier', 'entity_type', 'industry']),
            $data['profile'] ?? [],
        );

        return new ClientResource($client->load(['currentRegistration.sourceDocument', 'profile', 'assignedUsers']));
    }
}
