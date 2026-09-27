<?php

namespace App\Domain\Clients\Enums;

/** Where a registration status came from. */
enum StatusSource: string
{
    case BirCertificate = 'BIR_CERTIFICATE';
    case UserEntered = 'USER_ENTERED';
    case AdminOverride = 'ADMIN_OVERRIDE';

    public function label(): string
    {
        return match ($this) {
            self::BirCertificate => 'BIR Certificate of Registration',
            self::UserEntered => 'Entered by user',
            self::AdminOverride => 'Administrator override',
        };
    }

    /** A certificate-sourced status must be backed by the certificate document itself. */
    public function requiresCertificate(): bool
    {
        return $this === self::BirCertificate;
    }
}
