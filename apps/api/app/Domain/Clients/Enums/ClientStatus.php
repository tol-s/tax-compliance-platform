<?php

namespace App\Domain\Clients\Enums;

enum ClientStatus: string
{
    case Active = 'ACTIVE';
    case Archived = 'ARCHIVED';
}
