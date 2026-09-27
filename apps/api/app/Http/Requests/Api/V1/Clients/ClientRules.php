<?php

namespace App\Http\Requests\Api\V1\Clients;

use App\Domain\Clients\Enums\EntityType;
use Illuminate\Validation\Rule;

/** Validation rules shared by create and update requests. */
final class ClientRules
{
    /** @return array<string, mixed> */
    public static function identity(bool $partial): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return [
            'legal_name' => [$required, 'string', 'max:255'],
            'trade_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            // Format is validated loosely (digits, dashes, spaces): identifier rules are domain input.
            'taxpayer_identifier' => ['sometimes', 'nullable', 'string', 'max:32', 'regex:/^[0-9A-Za-z\- ]+$/'],
            'entity_type' => [$required, Rule::enum(EntityType::class)],
            'industry' => ['sometimes', 'nullable', 'string', 'max:120'],
        ];
    }

    /** @return array<string, mixed> */
    public static function profile(): array
    {
        return [
            'profile' => ['sometimes', 'array'],
            'profile.business_address' => ['sometimes', 'array'],
            'profile.business_address.line1' => ['sometimes', 'nullable', 'string', 'max:255'],
            'profile.business_address.line2' => ['sometimes', 'nullable', 'string', 'max:255'],
            'profile.business_address.city' => ['sometimes', 'nullable', 'string', 'max:120'],
            'profile.business_address.province' => ['sometimes', 'nullable', 'string', 'max:120'],
            'profile.business_address.postal_code' => ['sometimes', 'nullable', 'string', 'max:16'],
            'profile.registration_information' => ['sometimes', 'array'],
            'profile.registration_information.rdo_code' => ['sometimes', 'nullable', 'string', 'max:16'],
            'profile.registration_information.registered_activities' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'profile.registration_date' => ['sometimes', 'nullable', 'date'],
            'profile.fiscal_year_end_month' => ['sometimes', 'integer', 'between:1,12'],
            'profile.accounting_period' => ['sometimes', Rule::in(['CALENDAR', 'FISCAL'])],
            'profile.currency' => ['sometimes', 'string', 'size:3'],
            'profile.notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ];
    }

    /** @return array<string, mixed> */
    public static function document(bool $required): array
    {
        return [
            'document' => [$required ? 'required' : 'nullable', 'file', 'mimes:pdf,png,jpg,jpeg', 'max:20480'],
        ];
    }
}
