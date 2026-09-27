<?php

namespace App\Domain\Tenancy\Concerns;

use App\Domain\Tenancy\Exceptions\MissingTenantContext;
use App\Domain\Tenancy\Models\Organization;
use App\Domain\Tenancy\Scopes\OrganizationScope;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Apply to every tenant-owned model.
 *
 * - Queries are always filtered to the current tenant (OrganizationScope).
 * - organization_id is always taken from TenantContext on create; any value
 *   supplied by callers is overwritten, so client input cannot choose a tenant.
 * - Moving a record to another tenant is rejected.
 *
 * @mixin Model
 */
trait BelongsToOrganization
{
    public static function bootBelongsToOrganization(): void
    {
        static::addGlobalScope(new OrganizationScope);

        static::creating(function (Model $model): void {
            $context = app(TenantContext::class);

            if (! $context->has()) {
                throw MissingTenantContext::forModel($model::class);
            }

            $model->setAttribute('organization_id', $context->organizationId());
        });

        static::updating(function (Model $model): void {
            if ($model->isDirty('organization_id')) {
                throw new \LogicException('Tenant-owned records cannot be moved between organisations.');
            }
        });
    }

    /** @return BelongsTo<Organization, $this> */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
