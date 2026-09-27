<?php

use App\Domain\Identity\Enums\Permission;
use App\Domain\Identity\Enums\SystemRole;

it('defines the seven roles from the specification', function () {
    expect(array_map(fn ($r) => $r->label(), SystemRole::cases()))->toBe([
        'Owner', 'Admin', 'Tax Manager', 'Tax Preparer', 'Reviewer', 'Accountant', 'Read Only',
    ]);
});

it('defines the permission catalogue from the specification', function () {
    expect(Permission::values())->toBe([
        'clients.view', 'clients.create', 'clients.edit',
        'accounting.connect', 'accounting.sync',
        'tax_profile.view', 'tax_profile.edit',
        'tax_rules.view', 'tax_rules.manage',
        'calculations.run', 'calculations.adjust', 'calculations.approve',
        'working_papers.view', 'working_papers.generate',
        'forms.view', 'forms.generate', 'forms.approve', 'forms.export',
        'audit.view',
        'settings.manage',
    ]);
});

it('gives owners every permission and never duplicates a grant', function (SystemRole $role) {
    $values = array_map(fn ($p) => $p->value, $role->permissions());

    expect($values)->toBe(array_values(array_unique($values)));
})->with(SystemRole::cases());

it('reserves settings management for owners and admins', function (SystemRole $role) {
    expect(in_array(Permission::SettingsManage, $role->permissions(), true))
        ->toBe(in_array($role, [SystemRole::Owner, SystemRole::Admin], true));
})->with(SystemRole::cases());
