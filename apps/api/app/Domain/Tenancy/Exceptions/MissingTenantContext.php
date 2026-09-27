<?php

namespace App\Domain\Tenancy\Exceptions;

use RuntimeException;

/**
 * Thrown when tenant-owned data is accessed or created without an established
 * tenant context. The platform fails closed rather than leaking across tenants.
 */
class MissingTenantContext extends RuntimeException
{
    public static function forModel(string $model): self
    {
        return new self("No tenant context established while accessing tenant-owned model [{$model}].");
    }
}
