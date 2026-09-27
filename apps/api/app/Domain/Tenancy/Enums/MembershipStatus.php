<?php

namespace App\Domain\Tenancy\Enums;

enum MembershipStatus: string
{
    case Active = 'ACTIVE';
    case Invited = 'INVITED';
    case Suspended = 'SUSPENDED';
}
