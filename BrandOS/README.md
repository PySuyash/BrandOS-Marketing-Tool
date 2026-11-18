# BrandOS — AI-Powered Department-Specific Brand Governance Platform

BrandOS is an internal enterprise platform that reviews employee-created text and `.docx` documents before publication against department-specific guidelines, tone profiles, and approved knowledge base facts.

**Core principle: No proof, no flag.**  
Every rule finding cites a real department guideline (`MKT-RULE-*`, `HR-RULE-*`, `SLS-RULE-*`), and every claim verdict in the **Claim Ledger** (`SUPPORTED`, `CONFLICTS`, `UNVERIFIED`) is server-validated against stored approved facts (`MKT-FACT-*`, `HR-FACT-*`, `SLS-FACT-*`). Unverified claims are never silently marked as supported or auto-approved.

## Key Capabilities

- **Role-Based Access & Department Isolation**: Admin, Creator, Manager, and Reviewer roles with backend authorization middleware on all protected `/api/*` routes.
- **Department Knowledge Bases**: Independent rule sets and owner-attributed, expiry-tracked facts for Marketing, Human Resources (HR), and Sales, plus TXT/DOCX knowledge import.
- **DOCX Extraction & Multi-Version Submissions**: Extract `.docx` drafts via `mammoth`, preserve immutable version snapshots (`v1`, `v2`, `v3`...), and compare any two versions with word-level diffs.
- **Deterministic Fixed-Rule Engine**: Detects banned words, preferred terms, sentence/paragraph readability issues, required messaging omissions, and missing image alt-text descriptions.
- **AI Tone & Claim Review + Honest Fallback**: Server-side `@google/genai` (`gemini-4-hydrogen`) structured JSON analysis with strict citation validation and a clearly labelled deterministic demo-review fallback when `GEMINI_API_KEY` is unavailable.
- **Claim Ledger & Approval Workflow**: Track claims across `SUPPORTED`, `CONFLICTS`, and `UNVERIFIED`, verify evidence as a Reviewer, collaborate via version-linked comments, and enforce Manager approval/override guardrails.

## Setup & Commands

1. Configure environment variables (see `.env.example` — runtime `SQL_*` Cloud SQL variables are injected automatically in AI Studio).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Push PostgreSQL schema via Drizzle Kit:
   ```bash
   npm run db:push
   ```
4. Seed demo departments, users, guidelines, facts, and sample submissions:
   ```bash
   npm run db:seed
   ```
5. Start the full-stack server on port 3000:
   ```bash
   npm run dev
   ```
6. Production build:
   ```bash
   npm run build
   npm start
   ```

## Demo Employee Accounts

Default seeded password (configurable via `DEMO_USER_PASSWORD`): `BrandOS@2026`

- **Admin**: `admin@brandos.demo`
- **Marketing Creator**: `creator.marketing@brandos.demo`
- **Marketing Manager**: `manager.marketing@brandos.demo`
- **HR Creator**: `creator.hr@brandos.demo`
- **HR Manager**: `manager.hr@brandos.demo`
- **Sales Creator**: `creator.sales@brandos.demo`
- **Reviewer**: `reviewer@brandos.demo`
