# BUG-001 재현 관찰

## 명령
`bash _workspace/bug-001/reproduction.sh` (exit 0=버그 없음, 1=버그 재현, 2=대조군 이상)

## 환경 확인
- Windows node는 TZ를 존중함: `TZ=UTC` -> UTC, `TZ=Asia/Seoul` -> Seoul.
- 주의: Windows에서 `TZ=` (빈 값)은 시스템 TZ(Asia/Seoul)로 폴백된다. Linux CI의 빈 TZ=UTC와 다르므로 로컬에서 흉내 내려면 `TZ=UTC`를 써야 한다.
- 입력 '2026-11-01T00:30:00+09:00' = UTC 2026-10-31T15:30Z. 원인 후보: getFullYear/getMonth/getDate가 프로세스 로컬 TZ 기준.

## 3회 출력 (동일)
control TZ=Asia/Seoul -> 2026-11-01 / CONTROL OK
case    TZ=UTC        -> 2026-10-31 / BUG REPRODUCED (expected 2026-11-01) / exit=1

## 판정
결정론적 (3/3 동일). 게이트 통과. `TZ=UTC npx vitest run`도 실패(4 failed; 2 test files, 백업 디렉터리 테스트 포함 추정).
