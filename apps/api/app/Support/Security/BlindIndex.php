<?php

namespace App\Support\Security;

/**
 * Keyed, deterministic hash of a normalised value so encrypted columns can be
 * matched exactly (search, uniqueness) without storing or comparing plaintext.
 */
final class BlindIndex
{
    public static function taxpayerIdentifier(?string $value): ?string
    {
        $normalised = self::normaliseIdentifier($value);

        return $normalised === null ? null : hash_hmac('sha256', 'tin:'.$normalised, self::key());
    }

    public static function normaliseIdentifier(?string $value): ?string
    {
        $digits = preg_replace('/[^0-9A-Za-z]/', '', (string) $value);

        return $digits === '' ? null : strtoupper($digits);
    }

    private static function key(): string
    {
        $key = (string) config('app.blind_index_key') ?: (string) config('app.key');

        return str_starts_with($key, 'base64:') ? (string) base64_decode(substr($key, 7)) : $key;
    }
}
