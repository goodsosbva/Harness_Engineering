#!/bin/bash
# BUG-001 재현: 버그 케이스(TZ=UTC)가 기대값을 내면 PASS(exit 0), 아니면 BUG REPRODUCED(exit 1)
# 대조군(TZ=Asia/Seoul)이 기대값이 아니면 환경 이상(exit 2)
cd "$(dirname "$0")/../.." || exit 2
IN='2026-11-01T00:30:00+09:00'; WANT='2026-11-01'
run() { TZ="$1" node --input-type=module -e "import {businessDate} from './src/settlement.js'; console.log(businessDate('$IN'))"; }
ctl=$(run Asia/Seoul); bug=$(run UTC)
echo "control TZ=Asia/Seoul -> $ctl"; echo "case    TZ=UTC        -> $bug"
[ "$ctl" = "$WANT" ] && echo "CONTROL OK" || { echo "CONTROL BROKEN"; exit 2; }
[ "$bug" = "$WANT" ] && { echo "PASS (bug absent)"; exit 0; }
echo "BUG REPRODUCED (expected $WANT)"; exit 1
