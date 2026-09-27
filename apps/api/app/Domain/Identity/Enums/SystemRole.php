<?php

namespace App\Domain\Identity\Enums;

use App\Domain\Identity\Enums\Permission as P;

/**
 * Platform-defined roles available to every organisation. Organisations may
 * later define custom roles; system roles cannot be edited by tenants.
 */
enum SystemRole: string
{
    case Owner = 'owner';
    case Admin = 'admin';
    case TaxManager = 'tax_manager';
    case TaxPreparer = 'tax_preparer';
    case Reviewer = 'reviewer';
    case Accountant = 'accountant';
    case ReadOnly = 'read_only';

    public function label(): string
    {
        return match ($this) {
            self::Owner => 'Owner',
            self::Admin => 'Admin',
            self::TaxManager => 'Tax Manager',
            self::TaxPreparer => 'Tax Preparer',
            self::Reviewer => 'Reviewer',
            self::Accountant => 'Accountant',
            self::ReadOnly => 'Read Only',
        };
    }

    /** @return list<P> */
    public function permissions(): array
    {
        $view = [
            P::ClientsView, P::TaxProfileView, P::TaxRulesView,
            P::WorkingPapersView, P::FormsView,
        ];

        return match ($this) {
            self::Owner, self::Admin => P::cases(),
            self::TaxManager => [
                ...$view,
                P::ClientsCreate, P::ClientsEdit,
                P::AccountingConnect, P::AccountingSync,
                P::TaxProfileEdit, P::TaxRulesManage,
                P::CalculationsRun, P::CalculationsAdjust, P::CalculationsApprove,
                P::WorkingPapersGenerate,
                P::FormsGenerate, P::FormsApprove, P::FormsExport,
                P::AuditView,
            ],
            self::TaxPreparer => [
                ...$view,
                P::ClientsEdit, P::AccountingSync,
                P::CalculationsRun, P::CalculationsAdjust,
                P::WorkingPapersGenerate, P::FormsGenerate, P::FormsExport,
            ],
            // Reviewers approve but do not prepare, keeping segregation of duties.
            self::Reviewer => [
                ...$view,
                P::CalculationsApprove, P::FormsApprove, P::FormsExport, P::AuditView,
            ],
            self::Accountant => [
                ...$view,
                P::AccountingConnect, P::AccountingSync,
            ],
            self::ReadOnly => $view,
        };
    }
}
