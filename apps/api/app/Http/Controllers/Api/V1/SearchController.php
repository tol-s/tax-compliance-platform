<?php

namespace App\Http\Controllers\Api\V1;

use App\Application\Clients\ClientAccess;
use App\Http\Controllers\Controller;
use App\Support\Security\BlindIndex;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Global search for the command palette. Only returns records the user can open. */
class SearchController extends Controller
{
    public function __invoke(Request $request, ClientAccess $access): JsonResponse
    {
        $term = trim((string) $request->validate(['q' => ['required', 'string', 'min:2', 'max:120']])['q']);
        $index = BlindIndex::taxpayerIdentifier($term);
        $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term).'%';

        $clients = $request->user()->can('clients.view')
            ? $access->visibleClients($request->user())
                ->where(fn (Builder $q) => $q->where('legal_name', 'ilike', $like)
                    ->orWhere('trade_name', 'ilike', $like)
                    ->when($index, fn (Builder $q) => $q->orWhere('taxpayer_identifier_index', $index)))
                ->orderBy('legal_name')
                ->limit(8)
                ->get(['id', 'legal_name', 'trade_name'])
                ->map(fn ($c) => ['type' => 'client', 'id' => $c->id, 'title' => $c->legal_name, 'subtitle' => $c->trade_name, 'href' => "/clients/{$c->id}/overview"])
            : collect();

        return response()->json(['data' => $clients->values()]);
    }
}
