<?php

namespace App\Domain\Identity\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['key', 'group', 'description'])]
class Permission extends Model
{
    use HasUuids;
}
