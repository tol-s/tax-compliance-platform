<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Clients\Enums\EntityType;
use App\Domain\Clients\Enums\StatusSource;
use App\Domain\Clients\Enums\VatStatus;
use App\Domain\Documents\Enums\DocumentKind;
use App\Domain\Identity\Enums\SystemRole;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

/** Option lists for forms, served from the backend enums so the two sides cannot drift. */
class ReferenceController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $options = fn (array $cases) => array_map(fn ($c) => ['value' => $c->value, 'label' => $c->label()], $cases);

        return response()->json(['data' => [
            'entity_types' => $options(EntityType::cases()),
            'vat_statuses' => $options(VatStatus::cases()),
            'status_sources' => $options(StatusSource::cases()),
            'document_kinds' => $options(DocumentKind::cases()),
            'roles' => $options(SystemRole::cases()),
        ]]);
    }
}
