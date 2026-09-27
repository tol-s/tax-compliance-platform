<?php

/*
 * Vercel serverless entrypoint (vercel-php runtime). Every request is routed
 * here by vercel.json and handled by the normal Laravel front controller.
 *
 * This file lives in /api, so without correction Symfony would infer "/api"
 * as the application's base path and strip it from "/api/v1/..." URLs.
 * Present the request as if it hit public/index.php at the web root.
 */
$_SERVER['SCRIPT_FILENAME'] = __DIR__.'/../public/index.php';
$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['PHP_SELF'] = '/index.php';

require __DIR__.'/../public/index.php';
