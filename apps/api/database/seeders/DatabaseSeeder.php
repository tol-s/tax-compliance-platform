<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RbacCatalogueSeeder::class);

        // Demo data is only ever seeded behind an explicit flag, never in production.
        if (config('app.demo_mode') && ! app()->isProduction()) {
            $this->call(DemoSeeder::class);
        }
    }
}
