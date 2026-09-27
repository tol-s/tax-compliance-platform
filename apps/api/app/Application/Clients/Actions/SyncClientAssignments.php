<?php

namespace App\Application\Clients\Actions;

use App\Application\Audit\AuditLogger;
use App\Domain\Clients\Models\Client;
use App\Domain\Tenancy\Enums\MembershipStatus;
use App\Domain\Tenancy\Models\Membership;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Sets which organisation members are assigned to a client. Only active members of the same tenant can be assigned. */
class SyncClientAssignments
{
    public function __construct(private readonly AuditLogger $audit) {}

    /** @param list<string> $userIds */
    public function handle(Client $client, array $userIds): void
    {
        $userIds = array_values(array_unique($userIds));
        $valid = Membership::query()
            ->where('organization_id', $client->organization_id)
            ->where('status', MembershipStatus::Active)
            ->whereIn('user_id', $userIds)
            ->pluck('user_id')
            ->all();

        if (count($valid) !== count($userIds)) {
            throw ValidationException::withMessages(['user_ids' => 'Only active members of this organisation can be assigned.']);
        }

        DB::transaction(function () use ($client, $valid) {
            $before = $client->assignedUsers()->pluck('users.id')->sort()->values()->all();
            $client->assignedUsers()->sync(array_fill_keys($valid, ['organization_id' => $client->organization_id]));
            $after = collect($valid)->sort()->values()->all();

            if ($before !== $after) {
                $this->audit->record('client.assignments_changed', $client,
                    before: ['user_ids' => $before], after: ['user_ids' => $after], clientId: $client->getKey());
            }
        });
    }
}
