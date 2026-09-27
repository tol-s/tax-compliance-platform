<?php

namespace App\Support;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Throwable;

/**
 * Maps exceptions to the API error envelope. Stack traces, SQL and internal
 * messages never reach clients; the correlation ID links the response to the
 * server-side log entry.
 */
final class ApiExceptionRenderer
{
    public static function render(Throwable $e): JsonResponse
    {
        return match (true) {
            $e instanceof ValidationException => ApiError::response(
                'validation_failed', 'The given data was invalid.', 422, ['fields' => $e->errors()]
            ),
            $e instanceof AuthenticationException => ApiError::response(
                'unauthenticated', 'Authentication is required.', 401
            ),
            $e instanceof AuthorizationException, $e instanceof AccessDeniedHttpException => ApiError::response(
                'forbidden', 'You are not allowed to perform this action.', 403
            ),
            $e instanceof ModelNotFoundException, $e instanceof NotFoundHttpException => ApiError::response(
                'not_found', 'The requested resource was not found.', 404
            ),
            $e instanceof TooManyRequestsHttpException => ApiError::response(
                'rate_limited', 'Too many requests. Please retry later.', 429
            ),
            $e instanceof HttpExceptionInterface => ApiError::response(
                'http_error', $e->getStatusCode() < 500 ? ($e->getMessage() ?: 'Request failed.') : 'Server error.', $e->getStatusCode()
            ),
            default => ApiError::response(
                'server_error', 'An unexpected error occurred. Quote the correlation ID when contacting support.', 500
            ),
        };
    }
}
