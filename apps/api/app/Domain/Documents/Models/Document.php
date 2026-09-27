<?php

namespace App\Domain\Documents\Models;

use App\Domain\Clients\Models\Client;
use App\Domain\Documents\Enums\DocumentKind;
use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A stored file (registration certificate, supporting evidence, later generated PDFs). Content-addressed by SHA-256. */
#[Fillable(['client_id', 'kind', 'disk', 'path', 'original_name', 'mime_type', 'size', 'sha256', 'issued_at', 'created_by'])]
#[Hidden(['disk', 'path'])]
class Document extends Model
{
    use BelongsToOrganization, HasUuids;

    protected function casts(): array
    {
        return [
            'kind' => DocumentKind::class,
            'size' => 'integer',
            'issued_at' => 'date:Y-m-d',
        ];
    }

    /** @return BelongsTo<Client, $this> */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
