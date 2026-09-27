<?php

namespace App\Domain\Tenancy\Scopes;

use App\Domain\Tenancy\Exceptions\MissingTenantContext;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/** Restricts every query on a tenant-owned model to the current organisation. Fails closed. */
class OrganizationScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $context = app(TenantContext::class);

        if (! $context->has()) {
            throw MissingTenantContext::forModel($model::class);
        }

        $builder->where($model->qualifyColumn('organization_id'), $context->organizationId());
    }
}
