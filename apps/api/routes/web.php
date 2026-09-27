<?php

use Illuminate\Support\Facades\Route;

// API-only service: the user interface is apps/web.
Route::get('/', fn () => response()->json(['service' => 'tax-compliance-platform-api', 'api' => '/api/v1']));
