<?php

namespace App\Domain\Documents\Enums;

enum DocumentKind: string
{
    case CertificateOfRegistration = 'CERTIFICATE_OF_REGISTRATION';
    case RegistrationSupporting = 'REGISTRATION_SUPPORTING';
    case Other = 'OTHER';

    public function label(): string
    {
        return match ($this) {
            self::CertificateOfRegistration => 'BIR Certificate of Registration',
            self::RegistrationSupporting => 'Registration supporting document',
            self::Other => 'Other document',
        };
    }
}
