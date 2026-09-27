<?php

namespace App\Providers;

use App\Application\Identity\Authorization\PermissionResolver;
use App\Domain\Clients\Models\Client;
use App\Domain\Clients\Models\TaxpayerProfile;
use App\Domain\Clients\Models\TaxRegistrationStatus;
use App\Domain\Documents\Models\Document;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\Models\Membership;
use App\Domain\Tenancy\Models\Organization;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Scoped: one instance per request / queued job, reset between them.
        $this->app->scoped(TenantContext::class);
        $this->app->scoped(PermissionResolver::class);
    }

    public function boot(): void
    {
        Model::shouldBeStrict(! $this->app->isProduction());

        // Stable, class-name-free identifiers in audit rows and polymorphic columns.
        Relation::enforceMorphMap([
            'organization' => Organization::class,
            'membership' => Membership::class,
            'user' => User::class,
            'role' => Role::class,
            'client' => Client::class,
            'taxpayer_profile' => TaxpayerProfile::class,
            'tax_registration_status' => TaxRegistrationStatus::class,
            'document' => Document::class,
        ]);

        // Permission abilities (e.g. "calculations.approve") are answered from the
        // user's membership in the current tenant. Other abilities fall through
        // to policies.
        Gate::before(function (User $user, string $ability) {
            $resolver = app(PermissionResolver::class);

            return $resolver->isPermission($ability) ? $resolver->allows($user, $ability) : null;
        });

        RateLimiter::for('login', fn (Request $request) => [
            Limit::perMinute(5)->by(mb_strtolower((string) $request->input('email')).'|'.$request->ip()),
            Limit::perMinute(30)->by($request->ip()),
        ]);

        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(300)
            ->by($request->user()?->getAuthIdentifier() ?: $request->ip()));
    }
}
