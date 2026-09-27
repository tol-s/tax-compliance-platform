<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

/**
 * The single JSON error envelope used by every API error:
 * { "error": { "code", "message", "correlation_id", "details" } }
 */
final class ApiError
{
    /** @param array<string, mixed> $details */
    public static function response(string $code, string $message, int $status, array $details = []): JsonResponse
    {
        return new JsonResponse([
            'error' => array_filter([
                'code' => $code,
                'message' => $message,
                'correlation_id' => CorrelationId::current(),
                'details' => $details ?: null,
            ], fn ($v) => $v !== null),
        ], $status, [CorrelationId::HEADER => CorrelationId::current()]);
    }
}
