<?php

namespace App\Domain\Identity\Enums;

/**
 * The platform permission catalogue. This enum is the single source of truth:
 * the permissions table is synchronised from it by RbacCatalogueSeeder, and
 * Gate abilities with these names are resolved through the user's membership.
 */
enum Permission: string
{
    case ClientsView = 'clients.view';
    case ClientsCreate = 'clients.create';
    case ClientsEdit = 'clients.edit';

    case AccountingConnect = 'accounting.connect';
    case AccountingSync = 'accounting.sync';

    case TaxProfileView = 'tax_profile.view';
    case TaxProfileEdit = 'tax_profile.edit';

    case TaxRulesView = 'tax_rules.view';
    case TaxRulesManage = 'tax_rules.manage';

    case CalculationsRun = 'calculations.run';
    case CalculationsAdjust = 'calculations.adjust';
    case CalculationsApprove = 'calculations.approve';

    case WorkingPapersView = 'working_papers.view';
    case WorkingPapersGenerate = 'working_papers.generate';

    case FormsView = 'forms.view';
    case FormsGenerate = 'forms.generate';
    case FormsApprove = 'forms.approve';
    case FormsExport = 'forms.export';

    case AuditView = 'audit.view';

    case SettingsManage = 'settings.manage';

    public function group(): string
    {
        return explode('.', $this->value)[0];
    }

    public function description(): string
    {
        return match ($this) {
            self::ClientsView => 'View clients and taxpayer workspaces',
            self::ClientsCreate => 'Create clients',
            self::ClientsEdit => 'Edit client details',
            self::AccountingConnect => 'Connect and disconnect accounting systems',
            self::AccountingSync => 'Run accounting data synchronisation',
            self::TaxProfileView => 'View taxpayer registration and tax profile',
            self::TaxProfileEdit => 'Change taxpayer registration and tax profile',
            self::TaxRulesView => 'View tax rules, versions and test scenarios',
            self::TaxRulesManage => 'Draft, test and publish tax rules',
            self::CalculationsRun => 'Run tax calculations',
            self::CalculationsAdjust => 'Record manual adjustments with reasons',
            self::CalculationsApprove => 'Approve and finalise calculations',
            self::WorkingPapersView => 'View working papers',
            self::WorkingPapersGenerate => 'Generate working papers',
            self::FormsView => 'View tax forms',
            self::FormsGenerate => 'Generate tax forms',
            self::FormsApprove => 'Approve tax forms',
            self::FormsExport => 'Export and download tax forms',
            self::AuditView => 'View the audit log',
            self::SettingsManage => 'Manage organisation settings, users and roles',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
