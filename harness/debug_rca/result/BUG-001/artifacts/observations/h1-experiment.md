# H1 / H4 실험 결과 (BUG-001)

## 판정
- H1: 지지 (지시된 TZ 5종 전부에서 조건 충족, 단 1차 실행은 환경 문제로 무효 -> 재실행)
- H4: 지지 (Seoul exit 0, UTC exit 1)

## 실험 1-A: 지시된 bash 명령 그대로 (무효)
`for tz in ...; do TZ=$tz node --input-type=module -e "..."; done`
```
UTC 2026-10-31 2026-11-01
undefined 2026-11-01 2026-11-01
undefined 2026-11-01 2026-11-01
undefined 2026-11-01 2026-11-01
undefined 2026-11-01 2026-11-01
```
무효 사유: Windows Git Bash에서 슬래시가 든 TZ 값(America/Los_Angeles 등)이 node에 전달되지 않음 (process.env.TZ === undefined).
Intl resolvedOptions().timeZone 확인 결과 UTC 외 4줄은 모두 시스템 TZ(Asia/Seoul, -540)로 돌았음.
따라서 이 출력의 LA 줄(2026-11-01)은 H1 반증이 아니라 TZ 미적용 결과임.
(Asia/Seoul 이 아닌 UTC만 유효하게 적용됨. 표기 "undefined"는 3열 값과 무관.)

## 실험 1-B: spawnSync env로 TZ를 확실히 주입 (유효)
열: process.env.TZ | 실제 적용 TZ(Intl) | businessDate | Intl(Asia/Seoul 고정)
```
UTC UTC 2026-10-31 2026-11-01
America/Los_Angeles America/Los_Angeles 2026-10-31 2026-11-01
Asia/Seoul Asia/Seoul 2026-11-01 2026-11-01
Asia/Tokyo Asia/Tokyo 2026-11-01 2026-11-01
Pacific/Kiritimati Pacific/Kiritimati 2026-11-01 2026-11-01
```
지지 조건 대조: businessDate는 UTC/LA에서 2026-10-31, Seoul/Tokyo/Kiritimati에서 2026-11-01. Intl(Asia/Seoul 고정) 열은 5줄 모두 2026-11-01. 충족 -> H1 지지.
코드 확인: src/settlement.js 의 businessDate는 d.getFullYear/getMonth/getDate (로컬 TZ) 사용.

## 실험 2: H4 (tests/settlement.test.js)
- `TZ=Asia/Seoul npx vitest run tests/settlement.test.js` -> exit 0, "Tests 2 passed (2)"
- `TZ=UTC npx vitest run tests/settlement.test.js` -> exit 1, "Tests 2 failed (2)"
  - 마감 라벨: expected '2026-10-31 마감' to be '2026-11-01 마감'
-> H4 지지: 테스트 결과가 실행 TZ에 의존함 (Seoul 환경에서만 통과해 버그를 가림).
