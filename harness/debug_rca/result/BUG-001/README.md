# BUG-001 디버깅 / RCA 결과 정리

> 정산 마감일이 하루 전 날짜로 찍힘 — **해결 (수정-검증 1회차 PASS)** · 2026-11-01

## 한눈에 보기

| 항목        | 내용                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------ |
| 증상        | CI(Ubuntu)에서 `2026-11-01T00:30+09:00` → "2026-10-31 마감"                                      |
| 직접 원인   | `businessDate`가 `getFullYear/getMonth/getDate`(**프로세스 로컬 TZ**) 사용. CI는 UTC, 로컬은 KST |
| 수정        | `Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Seoul'})` + `BUSINESS_TZ` 상수                    |
| 회귀 테스트 | `tests/settlement.tz.test.js` — TZ를 UTC/LA/Seoul로 바꿔 UTC 15:00 경계 검증                     |
| 검증        | reproduction.sh 3/3 PASS · `npm test` 5/5 · `TZ=UTC npm test` 5/5                                |
| 남은 일     | `src/invoice.js` `issuedOn` 동일 결함 (미수정, 별도 티켓 권장)                                   |

## 진행 경과 (대화 흐름)

1. **요청** — 사용자: "BUG-001 디버깅해 줘" → `debug-rca` 스킬로 오케스트레이션 시작.
2. **준비** — 보고서·ci.log·소스 확인. git 저장소가 아니어서 롤백용 원본 백업(`backup.tar`)을 만들었음.
   - 처음에는 폴더째 백업했는데 vitest가 백업 안의 테스트까지 수집해 실패가 4건으로 부풀었음. tar로 묶어 해결.
3. **관찰 (팀: reproducer + log-analyzer)**
   - log-analyzer: 시간대 차이 발견 (로컬 Asia/Seoul vs CI `TZ=` → Linux에서 UTC). node v20/v22 차이는 무관.
   - reproducer: `TZ=UTC`로 3회 연속 `2026-10-31` 재현, 대조군 정상 → **게이트 1 통과** (오케스트레이터가 직접 3회 재확인).
   - 발견: Windows는 빈 `TZ=`를 시스템 TZ로 해석하므로 로컬에서는 `TZ=UTC`를 명시해야 재현됨.
4. **가설 (hypothesis-analyst)** — 피시본 분석으로 가설 5개 도출: H1 로컬 TZ getter(직접 원인), H4 테스트의 TZ 의존(결함을 가림), H2 CI 빈 TZ=UTC, H5 업무 TZ 미정의(번질 위험), H3 버전/로케일(제거 대상).
5. **사용자 지시** — "완료되면 대화 내용 및 결과를 /result 하위에 정리" → 이 문서.
6. **반증 실험 (reproducer)** — 5개 TZ 실험에서 businessDate는 UTC/LA만 10-31, Seoul 고정 Intl은 전부 11-01 → **H1 지지**. Seoul exit 0 / UTC exit 1 → **H4 지지**.
   - 발견: Windows Git Bash는 `TZ=Asia/Seoul`처럼 슬래시가 든 값을 node에 전달하지 못함 → spawnSync의 env 인자로 TZ를 넣어 재실험.
7. **수정 (fixer, attempt 1)** — settlement.js 최소 수정과 회귀 테스트 추가. 회귀 테스트는 수정 전 코드에서 UTC/LA 케이스가 실패함을 확인. invoice.js는 범위 밖이라 손대지 않음.
8. **재검증 (reproducer)** — 3/3 PASS, 전체 테스트 통과 → **PASS**.
9. **정리** — 포스트모템, 유사 패턴, 완료 체크리스트 작성.

## 기여 요인 (blameless)

1. 업무 기준 시간대(서울)가 명세에도 코드에도 없었음
2. 테스트가 실행 머신 TZ에 의존해 로컬에서 결함이 가려졌음
3. 같은 `TZ=` 설정이 OS마다 다르게 해석되고, CI 로그에 실제 TZ가 찍히지 않았음

## 재발 방지 액션

1. `src/invoice.js` `issuedOn` 동일 방식으로 수정
2. 업무 TZ 명문화와 날짜 헬퍼 일원화
3. CI에서 TZ 고정 또는 UTC/Seoul 매트릭스 테스트
4. CI 로그에 실제 시간대 출력
5. 업무 날짜 계산에서 로컬 TZ getter를 쓰면 린트 경고

## 변경 파일

- 수정: `src/settlement.js`
- 신규: `tests/settlement.tz.test.js`
- 패치: `artifacts/fix.patch`
- commit 없음 (git 저장소 아님). 원본은 `_workspace/bug-001/backup.tar`

## 산출물 (artifacts/)

| 파일                          | 내용                                                      |
| ----------------------------- | --------------------------------------------------------- |
| report.md                     | 보고서 정리                                               |
| observations/reproduction.md  | 재현 3회 기록                                             |
| observations/log-analysis.md  | 환경 차이·타임라인                                        |
| observations/h1-experiment.md | H1/H4 반증 실험                                           |
| hypotheses.md                 | 피시본, 가설 5개                                          |
| reproduction.sh               | 재현/재검증 스크립트 (exit 0=PASS, 1=버그, 2=대조군 이상) |
| fix.patch                     | 수정 diff                                                 |
| verification.md               | 수정-검증 기록                                            |
| postmortem.md                 | 포스트모템                                                |
| similar-patterns.md           | 유사 패턴 (invoice.js)                                    |
| completion-checklist.md       | 완료 체크리스트 (6/6)                                     |

원인

- 정산 날짜를 계산하는 businessDate(src/settlement.js)가 프로그램이 돌아가는 서버의 시간대를 기준으로 날짜를 셈하였사옵니다.
- 개발자 PC는 서울 시간이라 맞게 나왔사옵니다. CI 서버는 UTC라서 서울 기준 11월 1일 00:30이 10월 31일로 떨어졌사옵니다.
- CI에서 TZ=UTC로 돌리면 3번 모두 2026-10-31이 나왔고, 서울 시간에서는 2026-11-01이 나왔사옵니다. 시간대를 바꿔 가며 돌린 실험에서도 이 가설이 뒷받침되었나이다.

왜 그동안 드러나지 않았는가

- 날짜를 서울 기준으로 계산한다는 규칙이 명세에도 코드에도 적혀 있지 않았사옵니다.
- 테스트가 서울 시간인 PC에서만 통과하는 구조라 결함이 가려져 있었사옵니다.

수정

- 서울 시간대를 상수로 박아 두고, 서버 시간대와 상관없이 서울 날짜를 내도록 고쳤사옵니다. 표준 기능만 썼고 새 라이브러리는 들이지 않았나이다.
- 시간대를 UTC, LA, 서울로 바꿔 가며 확인하는 회귀 테스트(tests/settlement.tz.test.js)를 더하였사옵니다. 이 테스트는 수정 전 코드에서 실패하는 것을 확인했사옵니다.

검증 결과

- 재현 스크립트를 3번 연속 돌려 모두 통과했사옵니다.
- npm test와 CI 조건을 흉내 낸 TZ=UTC npm test 모두 5개 테스트가 통과했사옵니다.  
  아뢸 일 src/invoice.js의 청구서 발행일(issuedOn)에도 같은 결함이 있사옵니다. 이번 리 대상으로 기록해 두었나이다.
- 재현 스크립트의 서울 대조군은 Windows에서 실제로 서울 시간대로 바뀌어 돌지 않사옵니다. Git Bash가 Asia/Seoul처럼 /가 든 값을 node에 넘기지 못하여, PC 자체가 서울 시간이라 맞게 나온 것이옵니다. CI 조건은 TZ=UTC npm test로 따로 확인하였사옵니다.
- 이 폴더는 git 저장소가 아니므로 커밋은 하지 않았사옵니다. 원본은 \_workspace/bug-001/backup.tar에 남겨 두었나이다.

분부하신 대로 대화 경과와 결과물은 result/BUG-001/ 아래에 정리했사옵니다. 요약은 README.md에 있고, 포스트모템·가설·패치 등 산출물은 artifacts/ 아래에 있사옵니다.
