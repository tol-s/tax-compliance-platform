<?php

namespace App\Domain\Clients\Enums;

enum EntityType: string
{
    case Individual = 'INDIVIDUAL';
    case SoleProprietorship = 'SOLE_PROPRIETORSHIP';
    case Partnership = 'PARTNERSHIP';
    case Corporation = 'CORPORATION';
    case Cooperative = 'COOPERATIVE';
    case Other = 'OTHER';

    public function label(): string
    {
        return ucwords(strtolower(str_replace('_', ' ', $this->value)));
    }
}
