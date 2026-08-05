# Owner Checkpoint Report

Using the template in `05_CLAUDE_CODE_EXECUTION/OWNER_CHECKPOINT_REPORT_TEMPLATE.md`.

1. **Checkpoint/page:** Checkpoint 13 — **self-scoped**, not pack-mandated (same situation as Checkpoints 8-11; no
   `PAGE_XX` contract for Variation Orders exists in `03_PAGE_CONTRACTS/`). Grounded in two things: the pack's
   `CHANGE_VARIATIONS_CLAIMS_AND_FINAL_ACCOUNT_STANDARD.md`, and a real gap found (not invented) during
   Checkpoint 12's owner-requested cross-check of the source workbook (`CHECKPOINT_12_ADDENDUM.md`): the workbook's
   `📋 VO REGISTER` sheet evidences a complete Variation Order transaction type (raise, value against the BOQ
   baseline, single-actor approve) — 17 real columns — that no checkpoint 1-12 modeled at all. That standard's full
   scope is a much larger Change-Event engine (15 exposure states, procedural profiles per contract form, rate
   build-ups, time impact, disputes, PS/PC reconciliation, propagation to Forecast/Contract/Budget/Procurement) —
   this checkpoint deliberately builds only the workbook-evidenced slice (a flat register: raise → single-actor
   approve/reject, valued against a real BOQ code/rate), the same scoping-down pattern used for every other stage in
   this build. Full scope named as an explicit gap, not attempted — see §19.
2. **Branch and commit:** `claude/design-authority-review-azeq82`, on top of Checkpoints 1-12.
3. **Production files changed:** New: `src/server/variation-orders.ts`, `src/server/actions/variation-order-actions.ts`,
   `src/components/variation-orders/RaiseVoForm.tsx`, `src/components/variation-orders/VoDecisionButtons.tsx`,
   `src/app/app/projects/[projectId]/variation-orders/page.tsx`. Modified: `src/db/schema.ts`, `src/db/seed.ts`,
   `src/components/shell/DomainPanel.tsx` (enabled the "Variation orders" nav link, previously a disabled
   placeholder).
4. **Schema/migrations:** New `variation_order_status` enum (`PENDING`/`APPROVED`/`REJECTED` — the workbook's own
   simple pair, not the standard's 15-state lifecycle) and `variation_orders` table (23 columns: the workbook's 17
   real VO REGISTER columns plus `projectId`/`controlAccountId` FKs, `currency`, and the disclosed-demo-data flag
   pair used throughout this build). Regenerated the squashed dev migration (same convention as every prior
   checkpoint) and ran it against a freshly recreated local database.
5. **Routes/services/APIs:** New page `/app/projects/[projectId]/variation-orders`. Two new Server Actions:
   `raiseVariationOrder` (role `SITE_QS_COMMERCIAL`), `decideVariationOrder` (role `MANAGING_DIRECTOR`).
6. **Permissions/SoD:** Both actions are real, server-side role gates (`requireRole`), verified live by attempting
   each with the wrong role first and observing a real `forbidden` result before switching role and succeeding (see
   evidence §11-12). Role choices are disclosed judgment calls, not workbook-sourced: the workbook's ORIGINATOR and
   APPROVED BY columns hold free-text names in its (entirely empty) template rows, not role identifiers.
   `SITE_QS_COMMERCIAL` for raising mirrors that role's existing package-preparation function elsewhere in this
   build; `MANAGING_DIRECTOR` for approval reflects that a VO changes contract value, the same authority level
   already required for other commercial commitments (Checkpoint 12's chains) — not asserted as a workbook fact.
7. **Formula reconciliations:** `voValue = quantity × rate`, computed server-side (not client-trusted) in
   `raiseVariationOrder`. Both seeded demo VOs use real BOQ rates already verified and seeded elsewhere in this
   build (`CONC-SUB-RAFT-014` USD 142.75/m3 — same code as the golden fixture's own concrete line;
   `MASON-GF-BLK150-098` USD 19.19/m2 — same code as `MR-DEMO-0001`'s line), so only the triggering scenario is
   synthetic, not the unit economics.
8. **Evidence/lineage/audit:** None added this checkpoint — VO decisions do not yet write an `AuditEvent` (a
   disclosed gap, not silently skipped; see §19). Register itself is the visible source of truth for now.
9. **Tests:** No automated test suite (same disclosed gap as every prior checkpoint). Verification is live:
   Playwright/chromium driving real server actions against a freshly migrated + reseeded database.
10. **Build and deterministic install:** `tsc --noEmit`, `eslint`, `next build` all clean. No new npm dependencies.
11. **Browser states and viewports:** 5 screenshots at 1440x900 — seeded state, a blocked approve attempt, a
    successful approve, a blocked raise attempt, and a successful live raise. See
    `evidence/v7/checkpoint-13/screenshot-manifest.json`.
12. **Screenshot manifest and hashes:** `evidence/v7/checkpoint-13/screenshot-manifest.json` (SHA-256 per file).
13. **Region-by-region authority comparison:** Table columns verified 1:1 against the workbook's `VO REGISTER`
    sheet header row 7 (`VO NO`, `DATE RAISED`, `TRADE CODE`, `DESCRIPTION/SCOPE`, `ORIGINATOR`, `INSTRUCTION REF`,
    `DRAWING REF`, `BOQ ITEM REF`, `UNIT`, `QUANTITY`, `RATE`, `VO VALUE`, `APPROVAL STATUS`, `APPROVED BY`,
    `APPROVAL DATE`, `CONTRACT IMPACT`, `REMARKS`). The workbook's own data rows are all empty (`TOTAL VOs RAISED =
    0`), confirmed directly by inspection — this is the one entity in the whole build with zero real workbook
    transactions to reconcile against, disclosed rather than glossed over.
14. **Console/network:** Zero `[browser]` console error/warning entries in the clean verification run. One
    unrelated "destination stream closed early" server log line traced to an earlier draft verification script that
    crashed on a Playwright locator bug before closing its browser — confirmed not an application defect by
    re-running clean against a freshly reseeded database (see screenshot-manifest.json's `consoleErrors` field for
    the full account).
15. **Accessibility/performance/security:** Not independently re-run this checkpoint; the new UI reuses existing
    styled primitives (labelled inputs, buttons) already covered by Checkpoint 7's axe-core pass, but that coverage
    was not re-verified against this specific page. Disclosed, not asserted.
16. **Defects:**
    - *Found during verification, not an application defect:* a draft Playwright script bug (`page.selectOption
      ('select', { index: 0 })` with an ambiguous locator that matched the top-bar role switcher instead of the
      intended control-account dropdown) corrupted the acting role mid-script and then crashed on an unrelated
      locator error, producing one benign server-side log line. Root-caused and the clean re-run (this report's
      evidence) shows no such issue.
    - *No application defects found.*
17. **Approved variations:** None sought or granted.
18. **Owner decisions required before Checkpoint 14:** unchanged core list from `OWNER_ACCEPTANCE_PACK.md` §7
    (12 items after Checkpoint 12), **plus** one new item: is this flat-register slice of Variation Orders
    sufficient for now, or should a future checkpoint build toward the standard's fuller Change Event lifecycle
    (time impact, disputes, propagation to Forecast/Contract/Budget)?
19. **Next proposed checkpoint (not started):** Not decided. Two credible directions: (a) VO depth — audit
    logging for VO decisions (closing this checkpoint's own §8 gap), propagation of approved VO value into the
    Control Room's budget/commitment figures (currently VOs are visible only on their own register, not reflected
    in Page 01's numbers — a real, disclosed integration gap); (b) return to the broader Phase-1 hardening basket
    (observability, real auth, migration path). Not started; no code written toward either.
20. **Status:** `NOT OWNER-ACCEPTED`.

---

**Reproduction:** Fresh clone → `npm install` → `npx drizzle-kit migrate` → `npx tsx src/db/seed.ts` → `npm run dev`
→ `/app/projects/SWTBK/variation-orders`. Two demo VOs are pre-seeded (one `PENDING`, one already `APPROVED`) so
the register shows real state variety immediately; raising a new one requires "Acting as" QS/Commercial Lead,
deciding one requires switching to Managing Director.

CHECKPOINT 13 IMPLEMENTED AND VERIFIED — NOT OWNER-ACCEPTED — AWAITING OWNER REVIEW — DO NOT START ANOTHER
CHECKPOINT.
