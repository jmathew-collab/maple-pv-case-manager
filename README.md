# SafetyAssure — SaaS Starter

**Patient Safety • Governance • Compliance • Intelligence**

This repository is a GitHub-ready SafetyAssure prototype. It intentionally removes the old **Maple** and **Workbench** branding.

## What is included

### Working demo
The GitHub Pages frontend works without a backend and includes:
- Home dashboard
- Book In / ICSR validity gate
- Case creation
- Case queue and search
- Data Entry queue
- Medical Review queue
- QC Review queue
- Distribution queue
- Workflow transitions
- Case assignment fields
- Case detail editing
- Workflow/audit history
- MIS & CSV line listing export
- Governance & Compliance action register
- Safety Intelligence / signal-review queue
- Administration / reference-data architecture
- Seriousness, status and overdue KPIs
- Browser-local demo database

### SaaS-ready backend
`supabase/schema.sql` provides a PostgreSQL starting schema for:
- Organizations / tenancy
- Users and organization roles
- Safety cases
- Workflow events
- Medical assessments
- Compliance actions
- Audit events
- Row Level Security

`supabase/functions/transition-case/index.ts` provides the starting pattern for protected workflow transitions.

## GitHub Pages vs SaaS

GitHub Pages hosts the browser application as static HTML/CSS/JavaScript. It does **not** itself provide the multi-user database/backend. The intended architecture is:

Browser / GitHub Pages
→ Supabase Auth
→ PostgreSQL + Row Level Security
→ Edge Functions for protected workflow operations

The demo mode is useful for showcasing the complete workflow without exposing any patient data.

## Connect the SaaS backend

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Configure authentication and create an organization/member.
4. Copy `config.js` to your deployment configuration and add the Supabase Project URL + publishable key.
5. Deploy the Edge Function in `supabase/functions/transition-case`.
6. Keep secret/service-role keys only on trusted server-side components.
7. Test RLS and workflow transitions with separate roles before any real data is considered.

## Important PV / GxP note

This is a development/prototype architecture, not a validated pharmacovigilance system. Do not put real patient/ICSR data into the public GitHub demo. Production use would require, at minimum, formal requirements, risk assessment, privacy/security controls, RBAC, auditability, electronic records/signatures where applicable, controlled terminology and versioning, E2B(R3) implementation, reconciliation, testing, validation/qualification, backup/DR, change control and regulatory/legal review.

MedDRA, WHODrug and ISO/IDMP materials also have licensing/intellectual-property requirements; the application should integrate appropriately licensed data rather than embedding unauthorized copies.

## Branding

Product: **SafetyAssure**

Subtitle: **Patient Safety • Governance • Compliance • Intelligence**

No Maple branding and no Workbench branding are used in the application.


## v2 E2B(R3) data-entry and MIS upgrade

The v2 frontend expands the case workspace into an E2B(R3)-oriented structured entry form covering:
- C — Case identification / report information
- D — Patient characteristics
- E — Reaction/event with repeatable reactions and seriousness criteria
- F — Tests/procedures with repeatable results
- G — Drug information with repeatable products, dose, route, dates, indication, action, dechallenge/rechallenge
- H — Narrative
- Primary source/reporter
- Medical history / past drug history
- Medical assessment / causality
- Study identification
- Transmission metadata
- Source documents

MIS now supports receipt-date range, status, seriousness and text filtering and exports a broader operational line listing including E2B-oriented identifiers, reporter qualification, patient characteristics, product/IDMP fields, MedDRA fields, seriousness/outcome, workflow, causality, study and terminology-version columns.

The generated XML is deliberately labelled a **draft** and is not an ICH/EU transmission message. Production transmission must map the data model to the applicable ISO ICSR XML schema and current regional business rules and pass formal validation. The current ICH E2B(R3) Implementation Guide is Version 5.03 (18 July 2025); ICH and regional regulators publish additional implementation materials and business rules.
