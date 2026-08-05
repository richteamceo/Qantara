#!/usr/bin/env bash
# SECURITY_AND_ACCESS_CONTROL_STANDARD.md's checkable subset for this
# build (no managed infra to test MFA/SSO/session-store/WAF/pen-test
# against — see CHECKPOINT_11_REPORT.md §1 for what's out of scope and
# why). Intended to be the CI secret-scanning + dependency-scanning job
# the standard calls for, run locally until a real CI pipeline exists.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "=== 1. Secret scanning (gitleaks, full git history) ==="
gitleaks detect --source=. --no-git=false
echo "PASS — no secrets found"
echo

echo "=== 2. Raw/string-concatenated SQL in application code ==="
if grep -rn "\bsql\`" src/ 2>/dev/null; then
  echo "FAIL — raw sql template literal found in application code"
  exit 1
fi
echo "PASS — zero raw sql\` usage in src/ (all application queries go through Drizzle's parameterized query builder)"
echo

echo "=== 3. dangerouslySetInnerHTML / eval usage ==="
if grep -rn "dangerouslySetInnerHTML\|\beval(\|new Function(" src/ 2>/dev/null; then
  echo "FAIL — found a raw-HTML-injection or code-eval sink"
  exit 1
fi
echo "PASS — zero dangerouslySetInnerHTML/eval/Function-constructor usage"
echo

echo "=== 4. Dependency vulnerability scan (production dependencies only) ==="
npm audit --omit=dev
echo
echo "=== ALL CHECKS PASSED ==="
