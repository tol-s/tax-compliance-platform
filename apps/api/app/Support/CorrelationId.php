<?php

namespace App\Support;

use Illuminate\Support\Facades\Context;
use Illuminate\Support\Str;

/**
 * The correlation ID ties together a request, its audit events, its log lines
 * and any jobs it dispatches. Stored in Laravel Context, which is attached to
 * log records and propagated to queued jobs automatically.
 */
final class CorrelationId
{
    public const HEADER = 'X-Correlation-ID';

    public static function current(): string
    {
        $id = Context::get('correlation_id');

        if (! is_string($id) || ! Str::isUuid($id)) {
            $id = (string) Str::uuid7();
            Context::add('correlation_id', $id);
        }

        return $id;
    }

    public static function set(?string $candidate): string
    {
        $id = is_string($candidate) && Str::isUuid($candidate) ? strtolower($candidate) : (string) Str::uuid7();
        Context::add('correlation_id', $id);

        return $id;
    }
}
