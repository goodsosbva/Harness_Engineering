# BUG-001 보고서 정리

- 증상: CI에서 정산 테스트 2건 실패. 마감 라벨이 "2026-10-31 마감"으로 출력됨
- 기대 결과: `businessDate('2026-11-01T00:30:00+09:00')` → `2026-11-01`, 라벨 `2026-11-01 마감`
- 실제 결과(CI): `2026-10-31`, `2026-10-31 마감`
- 발생 환경: CI, ubuntu-latest 컨테이너, node v20.18.0, LANG=C.UTF-8, TZ= (비어 있음)
- 정상 환경: 개발자 로컬 Windows (npm test 전부 통과)
- 관련 코드: src/settlement.js (businessDate, cutoffLabel), tests/settlement.test.js
- 첨부: reports/ci.log
- 비고: git 저장소가 아님 → 롤백용 원본 백업은 _workspace/bug-001/backup/
