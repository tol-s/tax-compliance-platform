<?php

namespace App\Http\Controllers\Api\V1\Settings;

use App\Application\Identity\Actions\AddMember;
use App\Application\Identity\Actions\UpdateMember;
use App\Domain\Identity\Enums\SystemRole;
use App\Domain\Tenancy\Enums\MembershipStatus;
use App\Domain\Tenancy\Models\Membership;
use App\Domain\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Settings\StoreMemberRequest;
use App\Http\Requests\Api\V1\Settings\UpdateMemberRequest;
use App\Http\Resources\V1\MemberResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class MemberController extends Controller
{
    public function __construct(private readonly TenantContext $tenant) {}

    /** Listing members is needed to assign clients, so clients.edit may read it; managing needs settings.manage. */
    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless($request->user()->can('settings.manage') || $request->user()->can('clients.edit'), 403);

        return MemberResource::collection(
            Membership::query()
                ->where('organization_id', $this->tenant->organizationId())
                ->with(['user', 'role'])
                ->get()
                ->sortBy('user.name')
                ->values()
        );
    }

    public function store(StoreMemberRequest $request, AddMember $add): JsonResponse
    {
        Gate::authorize('settings.manage');
        $result = $add->handle(
            $request->user(),
            $request->string('name')->toString(),
            $request->string('email')->toString(),
            SystemRole::from($request->string('role')->toString()),
        );

        return response()->json([
            'data' => new MemberResource($result['membership']),
            // Shown once to the administrator; never stored in plaintext or logged.
            'temporary_password' => $result['temporary_password'],
        ], 201);
    }

    public function update(UpdateMemberRequest $request, string $membership, UpdateMember $update): MemberResource
    {
        Gate::authorize('settings.manage');
        $model = Membership::query()
            ->where('organization_id', $this->tenant->organizationId())
            ->with(['user', 'role'])
            ->findOrFail($membership);

        return new MemberResource($update->handle(
            $request->user(),
            $model,
            $request->has('role') ? SystemRole::from($request->string('role')->toString()) : null,
            $request->has('status') ? MembershipStatus::from($request->string('status')->toString()) : null,
        ));
    }
}
