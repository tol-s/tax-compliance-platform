<?php

use App\Http\Middleware\AssignCorrelationId;
use App\Http\Middleware\ResolveTenant;
use App\Http\Middleware\SecurityHeaders;
use App\Support\ApiExceptionRenderer;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [AssignCorrelationId::class, SecurityHeaders::class]);
        $middleware->alias(['tenant' => ResolveTenant::class]);
        // Tenant context must exist before route-model binding resolves tenant-owned models,
        // so bound IDs from another organisation resolve to 404.
        $middleware->prependToPriorityList(before: SubstituteBindings::class, prepend: ResolveTenant::class);
        // Behind a reverse proxy / load balancer in every deployed environment.
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
        $exceptions->render(function (Throwable $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiExceptionRenderer::render($e);
            }
        });
        $exceptions->dontFlash(['password', 'password_confirmation', 'current_password', 'token']);
    })->create();

// Serverless (Vercel): the deployment filesystem is read-only apart from /tmp.
if (getenv('VERCEL')) {
    $storage = '/tmp/storage';
    foreach (['framework/cache/data', 'framework/views', 'logs', 'app/private'] as $dir) {
        if (! is_dir("{$storage}/{$dir}")) {
            mkdir("{$storage}/{$dir}", 0775, true);
        }
    }
    $app->useStoragePath($storage);
}

return $app;
