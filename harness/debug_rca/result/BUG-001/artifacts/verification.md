
## Attempt 1

### 1. reproduction.sh x3
Command: `bash _workspace/bug-001/reproduction.sh` (3 consecutive runs)
Each run output (identical x3):
```
control TZ=Asia/Seoul -> 2026-11-01
case    TZ=UTC        -> 2026-11-01
CONTROL OK
PASS (bug absent)
```
exit=0, 0, 0 -> PASS (deterministic)

### 2. Full tests
- `npm test` -> 2 files, 5 tests passed, exit 0 -> PASS
- `TZ=UTC npm test` (CI simulation) -> 2 files, 5 tests passed, exit 0 -> PASS

### 3. Limitation
Windows Git Bash cannot pass slash TZ (Asia/Seoul) to node, so the reproduction.sh control runs on the system TZ (Seoul), not a true env override. The failing case (TZ=UTC) is a real override; the control is only equivalent to Seoul because the host is Seoul. TZ=UTC npm test covers the CI condition directly.

### Verdict: PASS
