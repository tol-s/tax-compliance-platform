<?php

namespace App\Application\Audit;

use App\Domain\Audit\Models\AuditLog;
use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\TenantContext;
use App\Support\CorrelationId;
use Illuminate\Contracts\Auth\Factory as AuthFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * Single entry point for writing audit events. Actor, tenant, IP, user agent
 * and correlation ID are resolved from the current request/job context so
 * call sites only describe what happened.
 */
class AuditLogger
{
    /** Attribute names whose values must never be persisted in audit snapshots. */
    public const REDACTED = [
        'password', 'remember_token', 'mfa_secret', 'access_token', 'refresh_token',
        'token', 'client_secret', 'secret',
    ];

    public function __construct(
        private readonly TenantContext $tenant,
        private readonly AuthFactory $auth,
        private readonly Request $request,
    ) {}

    /**
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     * @param  array<string, mixed>  $metadata
     */
    public function record(
        string $action,
        ?Model $entity = null,
        array $before = [],
        array $after = [],
        array $metadata = [],
        ?User $actor = null,
        ?string $organizationId = null,
    ): AuditLog {
        $actor ??= $this->auth->guard()->user();
        $organizationId ??= $this->tenant->has() ? $this->tenant->organizationId() : null;
        $interactive = ! app()->runningInConsole() || app()->runningUnitTests();

        $log = new AuditLog;
        $log->forceFill([
            'organization_id' => $organizationId,
            'actor_type' => $actor ? 'user' : (app()->runningInConsole() ? 'system' : 'anonymous'),
            'actor_id' => $actor?->getKey(),
            'action' => $action,
            'entity_type' => $entity ? $entity->getMorphClass() : null,
            'entity_id' => $entity?->getKey(),
            'before' => $before ? $this->redact($before) : null,
            'after' => $after ? $this->redact($after) : null,
            'metadata' => $metadata ? $this->redact($metadata) : null,
            'ip' => $interactive ? $this->request->ip() : null,
            'user_agent' => $interactive ? substr((string) $this->request->userAgent(), 0, 1000) : null,
            'correlation_id' => CorrelationId::current(),
        ]);
        $log->saveQuietly();

        return $log;
    }

    /**
     * @param  array<string, mixed>  $values
     * @return array<string, mixed>
     */
    private function redact(array $values): array
    {
        foreach ($values as $key => $value) {
            if (is_string($key) && in_array(strtolower($key), self::REDACTED, true)) {
                $values[$key] = '[redacted]';
            } elseif (is_array($value)) {
                $values[$key] = $this->redact($value);
            }
        }

        return $values;
    }
}
