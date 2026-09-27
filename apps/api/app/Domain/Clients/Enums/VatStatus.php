<?php

namespace App\Domain\Clients\Enums;

/**
 * Registered VAT status, taken from the taxpayer's registration record.
 * It is never inferred from transaction data.
 */
enum VatStatus: string
{
    case VatRegistered = 'VAT_REGISTERED';
    case NonVat = 'NON_VAT';

    public function label(): string
    {
        return match ($this) {
            self::VatRegistered => 'VAT registered',
            self::NonVat => 'Non-VAT',
        };
    }
}
