<?php

namespace App\Http\Requests\Api\V1\Clients;

use App\Domain\Clients\Enums\StatusSource;
use App\Domain\Clients\Enums\VatStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Changing registered status requires an effective date, a reason and a supporting document. */
class ChangeRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'vat_status' => ['required', Rule::enum(VatStatus::class)],
            'status_source' => ['required', Rule::enum(StatusSource::class)],
            'effective_from' => ['required', 'date', 'before_or_equal:+1 year'],
            'reason' => ['required', 'string', 'min:10', 'max:2000'],
            'document' => ['required', 'file', 'mimes:pdf,png,jpg,jpeg', 'max:20480'],
        ];
    }
}
