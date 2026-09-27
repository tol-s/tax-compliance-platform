<?php

namespace App\Domain\Clients\Models;

use App\Domain\Tenancy\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'client_id', 'jurisdiction_code', 'business_address', 'registration_information', 'registration_date',
    'fiscal_year_end_month', 'accounting_period', 'currency', 'notes',
])]
class TaxpayerProfile extends Model
{
    use BelongsToOrganization, HasUuids;

    protected function casts(): array
    {
        return [
            'business_address' => 'array',
            'registration_information' => 'array',
            'registration_date' => 'date:Y-m-d',
            'fiscal_year_end_month' => 'integer',
        ];
    }

    /** @return BelongsTo<Client, $this> */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
