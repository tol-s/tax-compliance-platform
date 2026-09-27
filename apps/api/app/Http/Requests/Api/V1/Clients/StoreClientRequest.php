<?php

namespace App\Http\Requests\Api\V1\Clients;

use App\Domain\Clients\Enums\StatusSource;
use App\Domain\Clients\Enums\VatStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            ...ClientRules::identity(partial: false),
            ...ClientRules::profile(),
            'registration' => ['required', 'array'],
            'registration.vat_status' => ['required', Rule::enum(VatStatus::class)],
            'registration.status_source' => ['required', Rule::enum(StatusSource::class)->except([StatusSource::AdminOverride])],
            'registration.effective_from' => ['required', 'date', 'before_or_equal:+1 year'],
            'registration.reason' => ['nullable', 'string', 'max:2000'],
            'certificate' => ['nullable', 'required_if:registration.status_source,BIR_CERTIFICATE', 'file', 'mimes:pdf,png,jpg,jpeg', 'max:20480'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['certificate.required_if' => 'Upload the BIR Certificate of Registration, or choose "Entered by user" as the source.'];
    }
}
