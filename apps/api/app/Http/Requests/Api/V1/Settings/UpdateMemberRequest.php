<?php

namespace App\Http\Requests\Api\V1\Settings;

use App\Domain\Identity\Enums\SystemRole;
use App\Domain\Tenancy\Enums\MembershipStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'role' => ['sometimes', Rule::enum(SystemRole::class)],
            'status' => ['sometimes', Rule::enum(MembershipStatus::class)->except([MembershipStatus::Invited])],
        ];
    }
}
