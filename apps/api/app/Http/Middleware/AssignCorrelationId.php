<?php

namespace App\Http\Middleware;

use App\Support\CorrelationId;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Context;
use Symfony\Component\HttpFoundation\Response;

/** Accepts a well-formed inbound correlation ID (from the BFF) or mints one, and echoes it back. */
class AssignCorrelationId
{
    public function handle(Request $request, Closure $next): Response
    {
        $id = CorrelationId::set($request->header(CorrelationId::HEADER));
        Context::add('request_path', $request->path());

        $response = $next($request);
        $response->headers->set(CorrelationId::HEADER, $id);

        return $response;
    }
}
