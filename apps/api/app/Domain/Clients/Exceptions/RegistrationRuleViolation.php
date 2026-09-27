<?php

namespace App\Domain\Clients\Exceptions;

use Illuminate\Validation\ValidationException;

/** A registration change that breaks a domain rule, reported as a field validation error. */
final class RegistrationRuleViolation
{
    public static function on(string $field, string $message): ValidationException
    {
        return ValidationException::withMessages([$field => $message]);
    }
}
