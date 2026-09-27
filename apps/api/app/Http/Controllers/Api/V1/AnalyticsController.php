<?php

namespace App\Http\Controllers\Api\V1;

use App\Application\Clients\ClientAccess;
use App\Domain\Audit\Models\AuditLog;
use App\Domain\Clients\Enums\EntityType;
use App\Domain\Clients\Enums\StatusSource;
use App\Domain\Clients\Enums\VatStatus;
use App\Domain\Clients\Models\Client;
use App\Domain\Clients\Models\TaxRegistrationStatus;
use App\Domain\Documents\Enums\DocumentKind;
use App\Domain\Documents\Models\Document;
use App\Domain\Tenancy\Enums\MembershipStatus;
use App\Domain\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

/**
 * Operational analytics computed from records that exist today: clients,
 * registration history, documents, assignments and the audit trail. Nothing
 * here is a tax figure. Client-based series respect client visibility, and
 * activity series require audit.view, exactly like the audit log itself.
 */
class AnalyticsController extends Controller
{
    private const TIMEZONE = 'Asia/Manila';

    private const MONTHS = 12;

    /** Audit actions grouped into the categories the activity chart shows. */
    private const ACTIVITY_CATEGORIES = [
        'clients' => ['client.'],
        'registration' => ['registration_status.', 'taxpayer_profile.'],
        'documents' => ['document.'],
        'team' => ['membership.', 'organization.', 'role.'],
        'sign_ins' => ['auth.login'],
    ];

    public function __invoke(Request $request, ClientAccess $access, TenantContext $tenant): JsonResponse
    {
        Gate::authorize('clients.view');

        $user = $request->user();
        $seesAll = $access->seesAllClients($user);
        $visibleIds = fn () => $access->visibleClients($user)->select('clients.id');
        $months = $this->months();
        $from = CarbonImmutable::parse($months[0].'-01', self::TIMEZONE)->utc();

        return response()->json(['data' => [
            'timezone' => self::TIMEZONE,
            'months' => $months,
            'scope' => $seesAll ? 'organization' : 'assigned',
            'clients' => $this->clients($access->visibleClients($user), $months, $from),
            'registrations' => $this->registrations($visibleIds, $months, $from),
            'documents' => $this->documents($visibleIds, $months, $from),
            'workload' => $seesAll ? $this->workload($tenant) : null,
            'activity' => $user->can('audit.view') ? $this->activity($months, $from) : null,
        ]]);
    }

    /** @return list<string> The last twelve calendar months, oldest first, as YYYY-MM. */
    private function months(): array
    {
        $current = CarbonImmutable::now(self::TIMEZONE)->startOfMonth();

        return array_map(
            fn (int $offset) => $current->subMonths(self::MONTHS - 1 - $offset)->format('Y-m'),
            range(0, self::MONTHS - 1),
        );
    }

    /**
     * @param  Builder<Client>  $clients
     * @param  list<string>  $months
     * @return array<string, mixed>
     */
    private function clients(Builder $clients, array $months, CarbonImmutable $from): array
    {
        $vat = (clone $clients)
            ->leftJoin('tax_registration_statuses as current_status', function ($join) {
                $join->on('current_status.client_id', '=', 'clients.id')->whereNull('current_status.effective_to');
            })
            ->selectRaw('current_status.vat_status as key, current_status.status_source as source, count(*) as count')
            ->groupBy('current_status.vat_status', 'current_status.status_source')
            ->get();

        $byVat = [];
        $bySource = [];
        foreach ($vat as $row) {
            $byVat[$row->key ?? 'NONE'] = ($byVat[$row->key ?? 'NONE'] ?? 0) + $row->count;
            if ($row->source) {
                $bySource[$row->source] = ($bySource[$row->source] ?? 0) + $row->count;
            }
        }

        $entity = (clone $clients)->selectRaw('entity_type as key, count(*) as count')->groupBy('entity_type')->pluck('count', 'key')->all();
        $industry = (clone $clients)->selectRaw("coalesce(nullif(trim(industry), ''), 'Not recorded') as key, count(*) as count")
            ->groupByRaw("coalesce(nullif(trim(industry), ''), 'Not recorded')")
            ->orderByDesc('count')->orderBy('key')
            ->pluck('count', 'key')->all();

        $added = (clone $clients)->where('clients.created_at', '>=', $from)
            ->selectRaw($this->monthOf('clients.created_at', false).' as month, count(*) as count')
            ->groupBy('month')->pluck('count', 'month')->all();

        return [
            'total' => (clone $clients)->count(),
            'active' => (clone $clients)->where('status', 'ACTIVE')->count(),
            'by_vat_status' => $this->breakdown($byVat, [
                ...array_map(fn (VatStatus $s) => [$s->value, $s->label()], VatStatus::cases()),
                ['NONE', 'No status recorded'],
            ]),
            'by_registration_source' => $this->breakdown($bySource, array_map(fn (StatusSource $s) => [$s->value, $s->label()], StatusSource::cases())),
            'by_entity_type' => $this->breakdown($entity, array_map(fn (EntityType $e) => [$e->value, $e->label()], EntityType::cases())),
            'by_industry' => $this->topWithOther($industry, 8),
            'added_by_month' => $this->series($added, $months),
        ];
    }

    /**
     * Initial registrations versus evidenced changes, by the month they were recorded.
     *
     * @param  list<string>  $months
     * @return array<string, mixed>
     */
    private function registrations(callable $visibleIds, array $months, CarbonImmutable $from): array
    {
        $rows = TaxRegistrationStatus::query()
            ->whereIn('client_id', $visibleIds())
            ->where('created_at', '>=', $from)
            ->selectRaw($this->monthOf('created_at', false).' as month')
            ->selectRaw('count(*) filter (where exists (
                select 1 from tax_registration_statuses earlier
                where earlier.client_id = tax_registration_statuses.client_id
                  and earlier.effective_from < tax_registration_statuses.effective_from
            )) as changes')
            ->selectRaw('count(*) as recorded')
            ->groupBy('month')
            ->get()->keyBy('month');

        return [
            'initial_by_month' => array_map(fn ($m) => (int) (($rows[$m]->recorded ?? 0) - ($rows[$m]->changes ?? 0)), $months),
            'changes_by_month' => array_map(fn ($m) => (int) ($rows[$m]->changes ?? 0), $months),
        ];
    }

    /**
     * @param  list<string>  $months
     * @return array<string, mixed>
     */
    private function documents(callable $visibleIds, array $months, CarbonImmutable $from): array
    {
        $documents = fn () => Document::query()->whereIn('client_id', $visibleIds());

        $kinds = $documents()->selectRaw('kind as key, count(*) as count')->groupBy('kind')->pluck('count', 'key')->all();
        $uploaded = $documents()->where('created_at', '>=', $from)
            ->selectRaw($this->monthOf('created_at', false).' as month, count(*) as count')
            ->groupBy('month')->pluck('count', 'month')->all();

        return [
            'total' => $documents()->count(),
            'by_kind' => $this->breakdown($kinds, array_map(fn (DocumentKind $k) => [$k->value, $k->label()], DocumentKind::cases())),
            'uploaded_by_month' => $this->series($uploaded, $months),
        ];
    }

    /**
     * Assigned clients per active member whose role only sees assigned clients.
     * Shown only to people who can already see every client.
     *
     * @return list<array<string, mixed>>
     */
    private function workload(TenantContext $tenant): array
    {
        return DB::table('organization_user as m')
            ->join('users as u', 'u.id', '=', 'm.user_id')
            ->join('roles as r', 'r.id', '=', 'm.role_id')
            ->leftJoin('client_user as cu', function ($join) {
                $join->on('cu.user_id', '=', 'm.user_id')->on('cu.organization_id', '=', 'm.organization_id');
            })
            ->leftJoin('clients as c', function ($join) {
                $join->on('c.id', '=', 'cu.client_id')->whereNull('c.deleted_at');
            })
            ->where('m.organization_id', $tenant->organizationId())
            ->where('m.status', MembershipStatus::Active->value)
            ->where('r.sees_all_clients', false)
            ->groupBy('u.id', 'u.name', 'r.name')
            ->orderByDesc(DB::raw('count(c.id)'))->orderBy('u.name')
            ->get(['u.id as user_id', 'u.name', 'r.name as role', DB::raw('count(c.id) as assigned_clients')])
            ->map(fn ($row) => [
                'user_id' => $row->user_id,
                'name' => $row->name,
                'role' => $row->role,
                'assigned_clients' => (int) $row->assigned_clients,
            ])->all();
    }

    /**
     * @param  list<string>  $months
     * @return array<string, mixed>
     */
    private function activity(array $months, CarbonImmutable $from): array
    {
        $category = 'case '.collect(self::ACTIVITY_CATEGORIES)->map(function (array $prefixes, string $key) {
            $conditions = collect($prefixes)->map(fn (string $prefix) => str_ends_with($prefix, '.')
                ? "action like '".addcslashes($prefix, '_%')."%'"
                : "action = '{$prefix}'")->implode(' or ');

            return "when {$conditions} then '{$key}'";
        })->implode(' ').' end';

        $rows = AuditLog::query()
            ->where('created_at', '>=', $from)
            ->selectRaw($this->monthOf('created_at', true)." as month, {$category} as category, count(*) as count")
            ->groupBy('month', 'category')
            ->get();

        $byMonth = array_map(function (string $month) use ($rows) {
            $entry = ['month' => $month];
            foreach (array_keys(self::ACTIVITY_CATEGORIES) as $key) {
                $entry[$key] = (int) $rows->where('month', $month)->where('category', $key)->sum('count');
            }

            return $entry;
        }, $months);

        $since = CarbonImmutable::now()->subDays(90);
        $byMember = AuditLog::query()
            ->join('users', 'users.id', '=', 'audit_logs.actor_id')
            ->where('audit_logs.created_at', '>=', $since)
            ->whereNotIn('audit_logs.action', ['auth.login', 'auth.logout', 'auth.login_failed'])
            ->groupBy('users.id', 'users.name')
            ->orderByDesc(DB::raw('count(*)'))->orderBy('users.name')
            ->limit(10)
            ->get(['users.name', DB::raw('count(*) as count')])
            ->map(fn ($row) => ['name' => $row->name, 'count' => (int) $row->count])->all();

        $activeMembers = AuditLog::query()
            ->where('created_at', '>=', $from)
            ->where('action', 'auth.login')
            ->selectRaw($this->monthOf('created_at', true).' as month, count(distinct actor_id) as count')
            ->groupBy('month')->pluck('count', 'month')->all();

        return [
            'by_month' => $byMonth,
            'by_member_90_days' => $byMember,
            'active_members_by_month' => $this->series($activeMembers, $months),
        ];
    }

    /** SQL expression for the YYYY-MM month of a timestamp in the reporting time zone. */
    private function monthOf(string $column, bool $withTimeZone): string
    {
        $zone = self::TIMEZONE;
        $local = $withTimeZone
            ? "({$column} at time zone '{$zone}')"
            : "(({$column} at time zone 'UTC') at time zone '{$zone}')";

        return "to_char({$local}, 'YYYY-MM')";
    }

    /**
     * @param  array<string, int>  $counts
     * @param  list<string>  $months
     * @return list<int>
     */
    private function series(array $counts, array $months): array
    {
        return array_map(fn (string $month) => (int) ($counts[$month] ?? 0), $months);
    }

    /**
     * Known categories in a fixed order, zero counts omitted.
     *
     * @param  array<string, int>  $counts
     * @param  list<array{0: string, 1: string}>  $labels
     * @return list<array{key: string, label: string, count: int}>
     */
    private function breakdown(array $counts, array $labels): array
    {
        $result = [];
        foreach ($labels as [$key, $label]) {
            if (($counts[$key] ?? 0) > 0) {
                $result[] = ['key' => $key, 'label' => $label, 'count' => (int) $counts[$key]];
            }
        }

        return $result;
    }

    /**
     * @param  array<string, int>  $counts  Already sorted, largest first.
     * @return list<array{key: string, label: string, count: int}>
     */
    private function topWithOther(array $counts, int $limit): array
    {
        $result = [];
        $other = 0;
        foreach ($counts as $label => $count) {
            if (count($result) < $limit) {
                $result[] = ['key' => (string) $label, 'label' => (string) $label, 'count' => (int) $count];
            } else {
                $other += $count;
            }
        }

        if ($other > 0) {
            $result[] = ['key' => 'OTHER', 'label' => 'Other industries', 'count' => $other];
        }

        return $result;
    }
}
