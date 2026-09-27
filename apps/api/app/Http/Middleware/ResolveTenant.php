<?php

namespace App\Http\Middleware;

use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\Enums\MembershipStatus;
use App\Domain\Tenancy\TenantContext;
use App\Support\ApiError;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Context;
use Symfony\Component\HttpFoundation\Response;

/**
 * Establishes the tenant for an authenticated request from the user's
 * current organisation, verified against an ACTIVE membership. The tenant is
 * never read from request input.
 */
class ResolveTenant
{
    public function __construct(private readonly TenantContext $tenant) {}

    public function handle(Request $request, Closure $next): Response
    {
        /** @var User $user */
        $user = $request->user();
        Context::add('user_id', $user->getKey());

        $membership = $user->current_organization_id
            ? $user->activeMembershipFor($user->current_organization_id)
            : null;

        // Fall back to the first active membership if the stored choice is no longer valid.
        if (! $membership) {
            $membership = $user->memberships()
                ->where('status', MembershipStatus::Active)
                ->oldest()
                ->first();

            if ($membership) {
                $user->forceFill(['current_organization_id' => $membership->organization_id])->saveQuietly();
            }
        }

        if (! $membership) {
            return ApiError::response('no_active_membership', 'You do not have access to any organisation.', 403);
        }

        $this->tenant->set($membership->organization()->firstOrFail(), $membership);

        try {
            return $next($request);
        } finally {
            $this->tenant->clear();
        }
    }
}
