<?php

namespace Database\Factories;

use App\Domain\Clients\Enums\ClientStatus;
use App\Domain\Clients\Enums\EntityType;
use App\Domain\Clients\Models\Client;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Client>
 */
class ClientFactory extends Factory
{
    protected $model = Client::class;

    public function definition(): array
    {
        return [
            'legal_name' => fake()->unique()->company(),
            'trade_name' => null,
            'taxpayer_identifier' => sprintf('%03d-%03d-%03d-%05d', fake()->numberBetween(100, 999), fake()->numberBetween(0, 999), fake()->numberBetween(0, 999), fake()->numberBetween(0, 99999)),
            'entity_type' => EntityType::Corporation,
            'industry' => 'Professional services',
            'status' => ClientStatus::Active,
        ];
    }
}
