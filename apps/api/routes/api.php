<?php

use App\Http\Controllers\Api\V1\AuditController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Clients\ClientAssignmentController;
use App\Http\Controllers\Api\V1\Clients\ClientController;
use App\Http\Controllers\Api\V1\Clients\DocumentController;
use App\Http\Controllers\Api\V1\Clients\RegistrationStatusController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\MeController;
use App\Http\Controllers\Api\V1\ReferenceController;
use App\Http\Controllers\Api\V1\SearchController;
use App\Http\Controllers\Api\V1\Settings\MemberController;
use App\Http\Controllers\Api\V1\Settings\RoleController;
use Illuminate\Support\Facades\Route;

// Malformed identifiers are a 404, never a database error.
Route::pattern('client', '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}');
Route::pattern('document', '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}');
Route::pattern('membership', '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}');

Route::prefix('v1')->name('api.v1.')->group(function () {
    Route::get('health', HealthController::class)->name('health');

    Route::post('auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:login')
        ->name('auth.login');

    Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout'])->name('auth.logout');

        // Everything below runs inside a resolved tenant context.
        Route::middleware('tenant')->group(function () {
            Route::get('me', [MeController::class, 'show'])->name('me');
            Route::post('me/organization', [MeController::class, 'switchOrganization'])->name('me.organization');

            Route::get('reference', ReferenceController::class)->name('reference');
            Route::get('dashboard', DashboardController::class)->name('dashboard');
            Route::get('search', SearchController::class)->name('search');

            Route::apiResource('clients', ClientController::class)->except('destroy');
            Route::get('clients/{client}/registration-statuses', [RegistrationStatusController::class, 'index'])->name('clients.registration-statuses.index');
            Route::post('clients/{client}/registration-statuses', [RegistrationStatusController::class, 'store'])->name('clients.registration-statuses.store');
            Route::get('clients/{client}/documents', [DocumentController::class, 'index'])->name('clients.documents.index');
            Route::post('clients/{client}/documents', [DocumentController::class, 'store'])->name('clients.documents.store');
            Route::put('clients/{client}/assignments', [ClientAssignmentController::class, 'update'])->name('clients.assignments.update');
            Route::get('clients/{client}/audit', [AuditController::class, 'forClient'])->name('clients.audit');
            Route::get('documents/{document}/download', [DocumentController::class, 'download'])->name('documents.download');

            Route::get('audit', [AuditController::class, 'index'])->name('audit.index');

            Route::get('members', [MemberController::class, 'index'])->name('members.index');
            Route::post('members', [MemberController::class, 'store'])->name('members.store');
            Route::patch('members/{membership}', [MemberController::class, 'update'])->name('members.update');
            Route::get('roles', [RoleController::class, 'index'])->name('roles.index');
        });
    });
});
