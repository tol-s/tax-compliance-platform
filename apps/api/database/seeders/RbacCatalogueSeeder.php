<?php

namespace Database\Seeders;

use App\Application\Identity\Actions\SyncRbacCatalogue;
use Illuminate\Database\Seeder;

class RbacCatalogueSeeder extends Seeder
{
    public function run(SyncRbacCatalogue $sync): void
    {
        $sync->handle();
    }
}
