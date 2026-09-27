<?php

namespace App\Http\Controllers\Api\V1;

use App\Application\Clients\ClientAccess;
use App\Domain\Audit\Models\AuditLog;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\AuditLogResource;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Real, computed dashboard figures. Metrics for modules that do not exist yet
 * (tax periods, calculations, forms, integrations) are reported as null so
 * the UI can say "not available" rather than showing a fabricated zero.
 */
class DashboardController extends Controller
{
    public function __invoke(Request $request, ClientAccess $access): JsonResponse
    {
        $user = $request->user();
        $clients = fn () => $access->visibleClients($user)->where('status', 'ACTIVE');

        $byStatus = fn (string $status) => $clients()
            ->whereHas('currentRegistration', fn (Builder $q) => $q->where('vat_status', $status))->count();

        $unverified = $clients()
            ->whereHas('currentRegistration', fn (Builder $q) => $q->whereNull('source_document_id'))->count();

        $recent = fn () => AuditLog::query()
            ->leftJoin('users', 'users.id', '=', 'audit_logs.actor_id')
            ->select('audit_logs.*', 'users.name as actor_name')
            ->whereNotIn('audit_logs.action', ['auth.login', 'auth.logout', 'auth.login_failed'])
            ->latest('audit_logs.created_at')
            ->limit(10);

        $activity = $user->can('audit.view') ? AuditLogResource::collection($recent()->get()) : null;

        // Without audit.view, people still see their own recent actions, but only on
        // clients they can currently see, so a removed assignment reveals nothing.
        $ownActivity = $activity === null
            ? AuditLogResource::collection(
                $recent()
                    ->where('audit_logs.actor_id', $user->getKey())
                    ->where(fn (Builder $q) => $q
                        ->whereNull('audit_logs.client_id')
                        ->orWhereIn('audit_logs.client_id', $access->visibleClients($user)->select('clients.id')))
                    ->get()
            )
            : null;

        return response()->json(['data' => [
            'clients' => [
                'total' => $clients()->count(),
                'vat_registered' => $byStatus('VAT_REGISTERED'),
                'non_vat' => $byStatus('NON_VAT'),
                'registration_unverified' => $unverified,
            ],
            'accounting_connections' => null,
            'tax_periods' => null,
            'exceptions' => null,
            'recent_activity' => $activity,
            'own_activity' => $ownActivity,
        ]]);
    }
}
