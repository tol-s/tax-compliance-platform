<?php

namespace App\Http\Requests\Api\V1\Clients;

use App\Domain\Documents\Enums\DocumentKind;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            ...ClientRules::document(required: true),
            'kind' => ['required', Rule::enum(DocumentKind::class)],
            'issued_at' => ['nullable', 'date', 'before_or_equal:today'],
        ];
    }
}
