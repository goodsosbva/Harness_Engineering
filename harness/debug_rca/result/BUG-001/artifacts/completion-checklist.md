# BUG-001 완료 체크리스트

- [x] 재현 3회 연속 확인 — TZ=UTC 3/3 BUG REPRODUCED, 대조군 3/3 정상 (observations/reproduction.md)
- [x] 1순위 가설 반증 실험 통과 — H1 지지, H4 지지 (observations/h1-experiment.md)
- [x] 수정 후 재현 스크립트 3회 연속 통과 — 3/3 exit 0 (verification.md Attempt 1)
- [x] 회귀 테스트 추가 — tests/settlement.tz.test.js (수정 전 코드에서 실패 확인)
- [x] 유사 패턴 검색 완료 — similar-patterns.md (invoice.js 1건)
- [x] 재발 방지 액션 작성 — postmortem.md 5건

수정-검증 루프: 1회차 PASS. git commit 없음 (저장소 아님).
