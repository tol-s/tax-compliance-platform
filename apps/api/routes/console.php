<?php

use App\Application\Identity\Actions\SyncRbacCatalogue;
use App\Application\Tenancy\Actions\CreateOrganization;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;

Artisan::command('rbac:sync', function (SyncRbacCatalogue $sync) {
    $sync->handle();
    $this->info('Permission catalogue and system roles synchronised.');
})->purpose('Synchronise permissions and system roles from the code catalogue (run on every deploy)');

Artisan::command('organization:create {name} {--owner-email=} {--owner-name=}', function (CreateOrganization $create) {
    $email = mb_strtolower((string) ($this->option('owner-email') ?: $this->ask('Owner email')));
    $name = (string) ($this->option('owner-name') ?: $this->ask('Owner name'));

    $password = null;
    $owner = User::query()->where('email', $email)->first();
    if (! $owner) {
        $password = Str::password(20);
        $owner = User::query()->create(['email' => $email, 'name' => $name, 'password' => $password]);
    }

    $organization = $create->handle((string) $this->argument('name'), $owner);

    $this->info("Organisation {$organization->name} ({$organization->id}) created; owner {$email}.");
    if ($password) {
        $this->warn("Initial owner password (shown once, change it after first login): {$password}");
    }
})->purpose('Create an organisation and its owner');
