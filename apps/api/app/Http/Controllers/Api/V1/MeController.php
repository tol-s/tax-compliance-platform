<?php

namespace App\Http\Controllers\Api\V1;

use App\Application\Tenancy\Actions\SwitchOrganization;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\SwitchOrganizationRequest;
use App\Http\Resources\V1\MeResource;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class MeController extends Controller
{
    public function show(Request $request): MeResource
    {
        return new MeResource($request->user());
    }

    public function switchOrganization(SwitchOrganizationRequest $request, SwitchOrganization $switch): Response
    {
        $switch->handle($request->user(), $request->string('organization_id')->toString());

        return response()->noContent();
    }
}
