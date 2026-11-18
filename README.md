# Finora Ledger And Operations

ابدا اريد كامل النظام بدون توقف لا تتوقف حتي تنتهي من كامل النظام

Build the complete FINORA commercial multi-tenant financial management SaaS platform according to the attached specification `FINORA — Complete Commercial Multi-Tenant (pasted).md`.

Key requirements:
1. Multi-tenant architecture with separate Platform Administration (`/platform`) and Company Workspace (`/app`) environments.
2. Database-level tenant isolation using PostgreSQL with Row Level Security (RLS) and trusted tenant context derived from authenticated user membership.
3. Sudan-first localization: Arabic language with RTL layout as primary, English LTR language toggle, Sudanese Pound (SDG) default currency, Africa/Khartoum timezone, and dynamic multi-currency management with exchange rates.
4. Full double-entry accounting engine: Chart of Accounts, balanced Journal Entries (debits = credits), General Ledger, Trial Balance, Income Statement, Balance Sheet, and Cash Flow Statement.
5. Operational modules: Cash & Bank accounts, Sales & Invoicing, Purchases & Bills, Customers, Suppliers, Branches, and RBAC with granular permissions.
6. Real database persistence, transactional integrity, and complete audit logging across all entities.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://finora-ledger-and-operations.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/88fe3e43-1466-4a44-80ee-9dade37f5c61).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
