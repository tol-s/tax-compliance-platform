<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Application\Identity\Actions\LoginUser;
use App\Application\Identity\Actions\LogoutUser;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LoginRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AuthController extends Controller
{
    public function login(LoginRequest $request, LoginUser $login): JsonResponse
    {
        $result = $login->handle(
            $request->string('email')->toString(),
            $request->string('password')->toString(),
            $request->string('device_name', 'web')->toString(),
        );

        return response()->json([
            'data' => [
                'token' => $result['token'],
                'token_type' => 'Bearer',
                'expires_at' => $result['expires_at']?->format(DATE_ATOM),
            ],
        ]);
    }

    public function logout(Request $request, LogoutUser $logout): Response
    {
        $logout->handle($request->user());

        return response()->noContent();
    }
}
