<?php

namespace App\Application\Tenancy\Actions;

use App\Application\Audit\AuditLogger;
use App\Domain\Identity\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

/** Changes the user's active tenant, only to an organisation where they hold an ACTIVE membership. */
class SwitchOrganization
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function handle(User $user, string $organizationId): void
    {
        $membership = $user->activeMembershipFor($organizationId)
            ?? throw new AuthorizationException('No active membership for that organisation.');

        DB::transaction(function () use ($user, $membership) {
            $previous = $user->current_organization_id;
            $user->forceFill(['current_organization_id' => $membership->organization_id])->save();

            $this->audit->record(
                'organization.switched',
                $user,
                before: ['organization_id' => $previous],
                after: ['organization_id' => $membership->organization_id],
                actor: $user,
                organizationId: $membership->organization_id,
            );
        });
    }
}
