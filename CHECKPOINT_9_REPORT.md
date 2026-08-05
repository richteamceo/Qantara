# Owner Checkpoint Report

Using the template in `05_CLAUDE_CODE_EXECUTION/OWNER_CHECKPOINT_REPORT_TEMPLATE.md`.

1. **Checkpoint/page:** Checkpoint 9 — **self-scoped**, not pack-mandated (same situation as Checkpoint 8; the pack's checkpoint programme ends at Checkpoint 7, and `OWNER_ACCEPTANCE_PACK.md` §7.6 is still an open owner decision). This checkpoint picks "backup/restore" from Checkpoint 7's deferred Phase-1 hardening basket, grounded in `BUSINESS_CONTINUITY_AND_DISASTER_RECOVERY_STANDARD.md` and `NON_FUNCTIONAL_REQUIREMENTS.md`'s "Backup, restore, RPO, RTO" section, which explicitly requires: "Backup restore tested quarterly (a real restore to a test environment, not just a 'backup completed successfully' log line)."
2. **Branch and commit:** `claude/design-authority-review-azeq82`, on top of Checkpoints 1–8.
3. **Production files changed:** `scripts/backup.sh` (new), `scripts/restore.sh` (new), `scripts/reconcile.ts` (new). No application code changed — this checkpoint is entirely operational tooling plus a live drill, not a feature.
4. **Schema/migrations:** none.
5. **Routes/services/APIs:** none. Three CLI scripts.
6. **Permissions/SoD:** not applicable — operator/infrastructure tooling, run outside the application's own RBAC model (consistent with every real backup/restore tool, which necessarily runs with database-superuser access the application itself never has).
7. **Formula reconciliations:** this checkpoint's core deliverable *is* a reconciliation mechanism. `scripts/reconcile.ts` compares row counts across all 16 tables plus 8 specific certified golden-fixture figures (PV-2026-0076's accepted net/tax/WHT/net payable/status, PO-2026-041's net/gross/status) between a source and a restored database — implementing `BUSINESS_CONTINUITY_AND_DISASTER_RECOVERY_STANDARD.md`'s explicit recovery-verification rule ("'the application responds' is not sufficient verification for a financial system, 'the figures reconcile' is") and `NON_FUNCTIONAL_REQUIREMENTS.md`'s "Close certificate reproduction after restore must match hashes/totals exactly."
8. **Evidence/lineage/audit:** `evidence/v7/checkpoint-9/disaster-recovery-drill-transcript.md` — a real, unedited terminal transcript of a full drill: (1) backup a pristine golden fixture, (2) restore to an isolated verification database, (3) reconcile — passes, (4) simulate the standard's own named scenario ("data corruption or erroneous bulk operation") by corrupting `PV-2026-0076`'s WHT/net-payable directly on "production," (5) reconcile again — **correctly fails**, exit code 1, proving the check has real teeth rather than always printing OK, (6) execute the actual recovery (cut back production to the verified-good backup), (7) final reconciliation — passes, exit code 0. Step 8 loads the recovered voucher in a real browser to confirm the application itself shows the correct figures, not just the database.
9. **Tests:** No automated test suite (same disclosed gap) — but this checkpoint's own deliverable *is* a verification tool, and it was proven to correctly detect a real injected fault (§8), which is a stronger test than most of this build's manual click-through verifications get.
10. **Build and deterministic install:** `npm run build`/`tsc --noEmit`/`eslint` clean, re-run against the recovered database as part of the drill (§8 step 8), not just against the original.
11. **Browser states and viewports:** one screenshot, 1440x900, of the recovered golden Payment Voucher — `evidence/v7/checkpoint-9/pv-after-recovery-1440x900.png`. Its hash is identical to the equivalent Checkpoint 8 screenshot, itself a form of evidence: the recovered application state is byte-for-byte visually indistinguishable from the never-corrupted original.
12. **Screenshot manifest and hashes:** `evidence/v7/checkpoint-9/screenshot-manifest.json`.
13. **Region-by-region authority comparison:** not applicable (no UI built this checkpoint).
14. **Console/network:** zero errors when loading the recovered application.
15. **Accessibility/performance/security:** Performance/timing was measured as part of the drill (backup <1s, restore 1s, cutback 1s — see transcript §"Timing") but explicitly **not** presented as evidence that the pack's 4-hour RTO / 15-minute RPO targets are met: this is a local single-node Postgres with a ~44KB seed dataset and no continuous point-in-time-recovery/WAL archiving, not the pack's target Multi-AZ managed database at production scale. What this drill demonstrates is that the backup/restore/reconciliation *mechanism* is correct and that the reconciliation check genuinely catches corruption rather than rubber-stamping — not that the specific numeric RTO/RPO targets are achieved. That gap is disclosed, not glossed over.
16. **Defects:** none found in application code this checkpoint (no application code touched). The scripts themselves were tested against their own failure mode (§8 step 5) before being trusted for the recovery step, rather than assumed correct.
17. **Approved variations:** none sought or granted.
18. **Owner decisions required before Checkpoint 10:** unchanged from `OWNER_ACCEPTANCE_PACK.md` §7, plus: (8) is a local pg_dump/restore drill sufficient evidence for this build's current stage, or should backup/restore be re-tested against a real managed-database (RDS-equivalent) environment before this gap is considered closed?
19. **Next proposed checkpoint (not started):** not specified — same open question as Checkpoints 7–8. Remaining untouched items from the Phase-1 hardening basket: security (deeper SAST/dependency posture beyond the one advisory noted in Checkpoint 8), performance (load testing, N+1 query audit — the pack's own performance gate explicitly names this), observability (structured logging, health-check endpoint), migration (this build has squashed every checkpoint's migration to a single `0000` file rather than testing a real incremental upgrade path — itself a disclosed simplification since Checkpoint 5), integration (no external system named as in-scope for this phase). Not started; no code written toward any of them.
20. **Status:** `NOT OWNER-ACCEPTED`.

---

**Reproduction:** `bash scripts/backup.sh` → `bash scripts/restore.sh
<dump-file>` → `npx tsx scripts/reconcile.ts postgres://.../core1x
postgres://.../core1x_restore_test`. To reproduce the full drill including
the corruption/detection step, see the exact commands in
`evidence/v7/checkpoint-9/disaster-recovery-drill-transcript.md`.

CHECKPOINT 9 IMPLEMENTED AND VERIFIED — NOT OWNER-ACCEPTED — AWAITING
OWNER REVIEW — DO NOT START ANOTHER CHECKPOINT.
