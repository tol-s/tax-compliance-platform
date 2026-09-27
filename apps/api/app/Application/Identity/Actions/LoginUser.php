<?php

namespace App\Application\Identity\Actions;

use App\Application\Audit\AuditLogger;
use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\Enums\MembershipStatus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Verifies credentials and issues an expiring API token for the BFF.
 * Failures are audited without revealing whether the email exists.
 */
class LoginUser
{
    /** Hash used to keep timing constant when the email is unknown. */
    private const DUMMY_HASH = '$2y$12$xx8M0t3DKJ10cFTAfGlk.u7a.g1uLLI6.S1IUltYC8iQ9Ffpofknm';

    public function __construct(private readonly AuditLogger $audit) {}

    /** @return array{user: User, token: string, expires_at: ?\DateTimeInterface} */
    public function handle(string $email, string $password, string $deviceName): array
    {
        $user = User::query()->where('email', mb_strtolower(trim($email)))->first();

        if (! Hash::check($password, $user?->password ?? self::DUMMY_HASH) || ! $user) {
            $this->audit->record('auth.login_failed', metadata: [
                'email_hash' => hash('sha256', mb_strtolower(trim($email))),
            ]);

            throw ValidationException::withMessages(['email' => 'These credentials do not match our records.']);
        }

        return DB::transaction(function () use ($user, $deviceName) {
            $membership = ($user->current_organization_id
                ? $user->activeMembershipFor($user->current_organization_id)
                : null)
                ?? $user->memberships()->where('status', MembershipStatus::Active)->oldest()->first();

            $user->forceFill([
                'last_login_at' => now(),
                'current_organization_id' => $membership?->organization_id,
            ])->save();

            $expiresAt = ($minutes = config('sanctum.expiration')) ? now()->addMinutes((int) $minutes) : null;
            $token = $user->createToken(mb_substr($deviceName, 0, 100), ['*'], $expiresAt);

            $this->audit->record('auth.login', $user, actor: $user, organizationId: $membership?->organization_id);

            return ['user' => $user, 'token' => $token->plainTextToken, 'expires_at' => $expiresAt];
        });
    }
}
