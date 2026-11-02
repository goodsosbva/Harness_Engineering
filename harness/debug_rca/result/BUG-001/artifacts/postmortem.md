# BUG-001 포스트모템 — 정산 마감일이 하루 전 날짜로 찍힘 (blameless)

## 증상
CI(Ubuntu 컨테이너)에서 `tests/settlement.test.js` 2건 실패. `businessDate('2026-11-01T00:30:00+09:00')`가 `2026-11-01` 대신 `2026-10-31`을 반환, 라벨이 "2026-10-31 마감"으로 출력. 개발자 로컬(Windows, KST)에서는 전부 통과.

## 타임라인 (2026-11-01)
| 단계 | 내용 |
|---|---|
| 보고 | QA가 CI 실패 보고 (reports/BUG-001.md, ci.log: `TZ=` 빈 값) |
| 관찰 | log-analyzer: 로컬 Asia/Seoul vs CI UTC 차이 발견. reproducer: `TZ=UTC`로 3/3 결정론 재현, 대조군 정상 → 게이트 1 통과 |
| 가설 | hypothesis-analyst: 5개 가설, 1순위 H1(로컬 TZ getter 사용) |
| 반증 실험 | 5개 TZ에서 businessDate는 UTC/LA만 10-31, Intl(Seoul 고정)은 전부 11-01 → H1 지지. H4(테스트 TZ 의존) 지지 |
| 수정 | attempt 1: Intl.DateTimeFormat + `BUSINESS_TZ='Asia/Seoul'`, TZ 전환 회귀 테스트 추가 |
| 검증 | reproduction.sh 3/3 PASS, `npm test`·`TZ=UTC npm test` 5/5 통과 |

## 직접 원인
`src/settlement.js`의 `businessDate`가 `getFullYear/getMonth/getDate`를 사용 → **프로세스 로컬 시간대** 기준으로 날짜를 계산. 입력 `+09:00` 오프셋은 파싱 시 UTC 시각(2026-10-31T15:30Z)으로 흡수되고, UTC 환경에서는 10-31로 떨어짐.

## 기여 요인 (시스템이 왜 이 결과를 허용했나)
1. **업무 기준 시간대가 명세·코드 어디에도 없었다** — "정산일 = 서울 기준"이라는 규칙이 암묵적이었고, 코드가 실행 환경의 TZ를 암묵적으로 업무 TZ로 사용.
2. **테스트가 실행 머신 TZ에 의존했다** — 로컬(KST)에서는 우연히 통과해 결함이 가려짐. vitest 설정에 TZ 고정 없음.
3. **CI와 로컬의 TZ가 달랐고 로그에 드러나지 않았다** — CI는 `TZ=`(빈 값 → Linux에서 UTC), Windows는 빈 TZ를 시스템 TZ로 해석. 같은 설정값이 OS마다 다르게 동작.
4. (관찰 중 발견) Windows Git Bash는 `TZ=Asia/Seoul` 같은 슬래시 포함 값을 node에 전달하지 못함 → 로컬 재현 도구의 대조군이 시스템 TZ로 돌아감.

## 수정 내용
- `src/settlement.js`: `BUSINESS_TZ = 'Asia/Seoul'` 상수 + `Intl.DateTimeFormat('en-CA', {timeZone})`로 YYYY-MM-DD 산출. 의존성 추가 없음, `cutoffLabel` 시그니처 유지.
- `tests/settlement.tz.test.js` 신규: `process.env.TZ`를 UTC / America/Los_Angeles / Asia/Seoul로 바꿔 UTC 15:00 경계 및 원 이슈 케이스 검증. 수정 전 코드에서 UTC·LA 케이스 실패 확인.
- 패치: `fix.patch`

## 재발 방지 액션
| # | 액션 | 종류 |
|---|---|---|
| 1 | `src/invoice.js` `issuedOn`도 같은 패턴 → 동일 방식으로 수정 (similar-patterns.md) | 코드 |
| 2 | 업무 기준 시간대(Asia/Seoul)를 명세/README에 명문화하고 날짜 계산은 공용 헬퍼 하나로 통일 | 설계 |
| 3 | CI에서 TZ를 명시적으로 고정하거나, 테스트를 UTC와 Asia/Seoul 두 TZ로 매트릭스 실행 | CI |
| 4 | CI 로그에 `date`, `node -e "console.log(Intl.DateTimeFormat().resolvedOptions().timeZone)"` 출력 추가 | 관측성 |
| 5 | 린트 규칙(예: no-restricted-syntax)으로 업무 날짜 계산에서 로컬 TZ getter 사용 경고 | 가드레일 |
