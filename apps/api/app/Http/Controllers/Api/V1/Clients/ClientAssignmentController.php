<?php

namespace App\Http\Controllers\Api\V1\Clients;

use App\Application\Clients\Actions\SyncClientAssignments;
use App\Domain\Clients\Models\Client;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\ClientResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ClientAssignmentController extends Controller
{
    public function update(Request $request, Client $client, SyncClientAssignments $sync): ClientResource
    {
        Gate::authorize('manageAssignments', $client);
        $validated = $request->validate(['user_ids' => ['present', 'array', 'max:200'], 'user_ids.*' => ['uuid']]);

        $sync->handle($client, $validated['user_ids']);

        return new ClientResource($client->load(['currentRegistration', 'profile', 'assignedUsers']));
    }
}
