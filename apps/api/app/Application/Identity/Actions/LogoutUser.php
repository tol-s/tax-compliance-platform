<?php

namespace App\Application\Identity\Actions;

use App\Application\Audit\AuditLogger;
use App\Domain\Identity\Models\User;
use Laravel\Sanctum\PersonalAccessToken;

class LogoutUser
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function handle(User $user): void
    {
        $token = $user->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        $this->audit->record('auth.logout', $user, actor: $user, organizationId: $user->current_organization_id);
    }
}
