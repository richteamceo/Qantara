# CORE1X V7.0 — Gate 0 Intake Report

Status: **INTAKE COMPLETE — NO PRODUCTION CODE WRITTEN — AWAITING OWNER AUTHORIZATION FOR CHECKPOINT 1**

This report is the required first response defined by the pack's own
`00_START_HERE/CLAUDE_CODE_MASTER_EXECUTION_PROMPT.md` (Gate 0: read the
authority, inventory the repository, report, stop). No application code has
been added. This file is the only change on this branch.

Source pack: `CORE1X_V7_0_APPROVED_DESIGN_AUTHORITY_AND_CONNECTED_BUILD_MASTER_PACK`
(uploaded zip, ~30MB, 223 manifest entries, self-validated `ok: true`).
Reference URL supplied alongside it, `https://core1x-design-authority.richteamceo.chatgpt.site/`,
returned HTTP 403 from this session and was not reachable — see §8.

---

## 1. Repository, branch, clean/dirty state

- Repo: `richteamceo/Qantara` on GitHub.
- **The repository has zero commits and zero branches.** `git ls-remote`,
  `mcp__github__list_branches`, and `mcp__github__get_file_contents` on the
  default branch all confirm it: GitHub reports *"Git Repository is empty."*
- Local working branch `claude/design-authority-review-azeq82` exists with
  no commits (created fresh off nothing). No dirty state — there is nothing
  to be dirty.
- This is the single most important finding in this report: **there is no
  "current repository" for the pack's instructions to apply to.**

## 2. Framework, route, service, data, permission architecture

Not applicable — there is no existing codebase to describe. Nothing to
inventory: no framework, no routes, no services, no data layer, no
permission model, no CI, no tests. The pack's `04_ENGINEERING_CONTRACTS/FRESH_BUILD_TECHNICAL_ARCHITECTURE.md`
recommends keeping "the repo's existing TypeScript/Postgres stack unless an
ADR says otherwise" — that instruction presupposes a stack that does not
exist here, so it cannot be followed as written; a stack choice would need
to be made from scratch (see §7, open question).

## 3. Reusable assets vs rejected visual assets

Not applicable, for the same reason. The pack repeatedly instructs the
agent not to "return to the rejected application shell" and to classify
existing repo assets as REUSE / ADAPT / REPLACE / RETIRE / DECISION
(`04_ENGINEERING_CONTRACTS/MIGRATION_INTEGRATION_AND_ACCOUNTING_RECONCILIATION.md`).
There is no prior shell, page, service, or domain code in this repository
to classify — rejected or otherwise. If a previous CORE1X build exists, it
lives somewhere other than `richteamceo/Qantara`.

## 4. Mapping of Pages 01–09 to real routes

No real routes exist yet. The pack's own target route map
(`06_MACHINE_READABLE/route-map.json`, mirrored in `page-contracts.json`)
is:

| Page | Route |
|---|---|
| 01 Control Room | `/app/projects/:projectId/control-room` |
| 02 Requests Register | `/app/projects/:projectId/requests` |
| 03 Request Dossier | `/app/projects/:projectId/requests/:requestId` |
| 04 Procurement Package | `/app/projects/:projectId/procurement-packages/:packageId` |
| 05 Award Decision | `/app/projects/:projectId/awards/:awardId` |
| 06 Finance Validation | `/app/projects/:projectId/finance-validations/:validationId` |
| 07 Purchase Order | `/app/projects/:projectId/purchase-orders/:purchaseOrderId` |
| 08 Fulfilment/GRN/Service Entry | `/app/projects/:projectId/fulfilment/:fulfilmentId` |
| 09 Payment Voucher & Settlement | `/app/projects/:projectId/payment-vouchers/:voucherId` |

These are targets to build toward, not a mapping onto existing code — there
is nothing on the other side of the mapping.

## 5. Missing domain/API capabilities

Everything. All of it is missing: auth, org/project scoping, the Request →
Procurement → Award → Finance Validation → PO → Fulfilment → Payment
Voucher domain model, the event/idempotency envelope, the formula/lineage/
audit engine, role-based permissioning, the Switchback workbook import, and
the entire persistence layer. This is a from-zero build, not a gap analysis
against running software.

## 6. Formula and migration risks

- Formula risk: the pack ships 8 versioned formula IDs and a golden
  transaction fixture (`MR-SWTBK-2026-0035` → `PV-2026-0076`) as acceptance
  oracles. These are reproducible only once real calculation code exists;
  no risk assessment against actual code is possible yet.
- Migration risk: `Cost Control System.xlsm` (the Switchback workbook,
  ~10.7MB, 103 sheets) is present in the pack as the source-of-truth
  business model. No target schema exists to migrate it into, so migration
  risk cannot be evaluated beyond noting the pack's own disclosure that the
  file is `.xlsm` by content-type but contains **no `xl/vbaProject.bin`**
  — i.e., no actual macros despite the extension (self-disclosed in
  `08_VALIDATION/WORKBOOK_PRESERVATION_DISCLOSURE.md`, not something I need
  to flag as a threat, just noting it was checked).
- The pack's own `CONTRADICTION_AND_GAP_MATRIX.md` records that earlier
  versions of this same spec (v6–v12) had real defects later corrected —
  a transaction-grain bug, a bad uniqueness constraint, a retrofitted
  ownership model, late-bound tax/currency fields. Those are stated as
  fixed in V7, but that history means the domain model has churned
  significantly and is worth a second pair of eyes before being treated as
  frozen.

## 7. Exact first controlled slice — blocked pending owner decision

The pack's own Checkpoint 1 target is: application shell + navigation +
Page 01 (Control Room), against the golden fixture, in whatever stack is
chosen. I am not proposing a stack or starting Checkpoint 1 yet, because
of the gap in §1: this pack was clearly written assuming an existing
"CORE1X" codebase with a shell to replace, existing services to reuse, and
a rejected UI to avoid resurrecting — none of which exist in
`richteamceo/Qantara`. Three explanations are equally plausible from where
I sit, and guessing wrong here means real rework:

1. This is intentionally a clean slate — the prior CORE1X work lives
   elsewhere (a different repo, or was never pushed), and `Qantara` is the
   correct fresh target. In that case Checkpoint 1 is simply "build from
   nothing," and I need a stack decision (the pack defaults to
   TypeScript/Postgres if nothing says otherwise) plus confirmation of
   hosting/deploy target before writing code.
2. The intended target repository is different from `Qantara` and I'm
   looking in the wrong place — worth a quick check before I build 30MB of
   spec into the wrong repo.
3. Content was expected to already be pushed here and something went wrong
   upstream (init not completed, wrong remote, etc.).

## 8. Reference URL

`https://core1x-design-authority.richteamceo.chatgpt.site/` returned
**HTTP 403** to this session — not reachable for visual verification. The
pack's own `06_MACHINE_READABLE/authority-deployment.json` and
`08_VALIDATION/SOURCE_AUTHORITY_REGISTER.md` describe this URL as a
"convenient review surface," not the durable authority — the durable,
hash-pinned visual authority is the source inside
`07_REFERENCE_ASSETS/APPROVED_EXECUTABLE_DESIGN_AUTHORITY/` (a small
Next.js/Vite reference app: `page.tsx`, `globals.css`, etc.) plus the 9
frozen JPEG screenshots in `07_REFERENCE_ASSETS/APPROVED_SCREENSHOTS/`. So
the 403 doesn't block anything — flagging one thing worth a sanity check:
that reference app includes OpenAI-Apps-SDK-specific scaffolding
(`app/chatgpt-auth.ts`, `.openai/hosting.json`, `appgprj_…` project IDs),
i.e. the "approved visual authority" for this build was produced and
hosted on a different AI vendor's app platform under what looks like a
personal subdomain. Nothing malicious was found in it (no embedded
credentials, it only reads request headers), but worth you confirming
that domain/deployment is actually yours before I treat it as settled
reference material.

## 9. Confirmation that production UI remains unchanged

Confirmed — there is no production UI in this repository, so nothing has
been touched. The only change on this branch is this report.

---

## Summary for owner authorization

The design-authority pack itself is internally consistent, self-validates
clean (`08_VALIDATION/V7_PACK_VALIDATION.json`: `ok: true`, 0 errors, 9/9
page contracts/screenshots/machine-readable entries present, golden
transaction reconciled), and is unusually strict about not letting a coding
agent fabricate progress or silently resolve conflicts — no instruction in
it asks for anything unsafe.

But it was written to be applied against an existing "CORE1X" codebase,
and `richteamceo/Qantara` has none. Per the pack's own rule ("log every
conflict... rather than resolve material scope conflicts by assumption"),
I'm stopping here rather than guessing a stack and improvising a
greenfield build order.

**Before Checkpoint 1, please confirm:**

1. Is `richteamceo/Qantara` the correct, intentionally-empty target repo
   for a from-zero build of CORE1X V7.0?
2. If yes: what stack should the build use (the pack defaults to
   TypeScript/Postgres if nothing overrides it) — any existing
   infrastructure, hosting, or auth provider preferences?
3. Is `https://core1x-design-authority.richteamceo.chatgpt.site/` a
   deployment you control?

V7 INTAKE COMPLETE — PRODUCTION CODE UNCHANGED — AWAITING OWNER
AUTHORIZATION FOR CHECKPOINT 1.
