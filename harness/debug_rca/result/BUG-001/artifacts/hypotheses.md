# BUG-001 가설 분석

입력: report.md, observations/reproduction.md, observations/log-analysis.md, reproduction.sh, src/settlement.js, src/invoice.js, tests/settlement.test.js, reports/ci.log, package.json
작성 원칙: 실험은 설계만 함 (실행은 reproducer). 모든 명령은 프로젝트 루트(`C:\Users\admin\Desktop\side\harness\debug_rca`)의 bash 기준.

## 0. 확정 관찰 (재확인 불필요)

- 입력 `2026-11-01T00:30:00+09:00` = 절대 시각 `2026-10-31T15:30:00Z`. 파싱 단계는 환경과 무관.
- `TZ=UTC` → `2026-10-31` (BUG), `TZ=Asia/Seoul` → `2026-11-01` (정상). 3/3 결정론.
- CI 실패값(`2026-10-31`, `2026-10-31 마감`)은 로컬 `TZ=UTC` 실측값과 문자 단위로 같음.
- CI 로그: `TZ=` 빈 값, 시스템 시간대 정보는 로그에 없음 (UTC는 추정).
- Windows는 빈 `TZ=`를 시스템 TZ(Seoul)로, Linux는 UTC로 해석 → 로컬에서 `TZ=`로는 CI를 흉내 낼 수 없음.
- 프로젝트에 vitest 설정 파일 없음. 테스트 어디에도 TZ 고정 없음 (`package.json`: `"test": "vitest run"`).

## 1. 피시본 표

| 범주 | 이 버그를 일으킬 수 있는 요인 | 관찰과의 관계 |
|---|---|---|
| 코드 | `businessDate`가 `getFullYear/getMonth/getDate`(프로세스 로컬 TZ 기준 getter)로 날짜를 뽑음. 업무 시간대(Asia/Seoul)를 코드가 지정하지 않음 | 직접 일치. TZ만 바꿔 결과가 바뀜 |
| 코드 | 입력 문자열의 `+09:00` 오프셋은 `new Date()`에서 절대 시각으로 흡수되고 버려짐. "어느 시간대의 달력 날짜인가"라는 정보가 사라짐 | 일치 (설계 결함) |
| 코드 | 같은 패턴이 `src/invoice.js` `issuedOn`에도 있음 (형제 호출부, 잠재 결함) | 미확인 → H5 |
| 환경 | CI 컨테이너 `TZ=` 빈 값 → glibc/node가 UTC로 해석 | 간접 일치 (값은 일치, 직접 관측은 없음) → H2 |
| 환경 | 개발자 Windows 시스템 TZ가 Asia/Seoul이고 빈 `TZ=`도 Seoul로 폴백 → 로컬에서 결함이 가려짐 | 일치 (실측) |
| 환경 | LANG 차이 (CI `C.UTF-8` / 로컬 `en_US.UTF-8`) | getter는 로케일 무관 → 반대 증거 있음, H3에서 제거 |
| 의존성 | node 버전 차이 (v20.18.0 / v22.23.3), ICU·tzdata 번들 차이 | 호출자 보고상 "버전 무관" → 반대 증거, H3에서 제거 |
| 의존성 | vitest `^5.0.5` 캐럿 범위 → CI·로컬 vitest 버전 다를 수 있음 | 테스트 러너는 Date 동작에 개입 안 함, 해당 가능성 낮음 (H3에 포함) |
| 데이터 | 자정 직후(KST 00:00~08:59) 입력만 UTC 기준으로 전날이 됨. 테스트 입력이 바로 이 구간 | 일치. 이 구간 밖 입력이면 결함이 드러나지 않음 |
| 데이터 | 업무 날짜의 기준 시간대가 데이터 계약(명세)에 정의돼 있지 않음 | 일치 (blameless 관점) → H5 |
| 테스트 | 테스트가 TZ를 고정하지 않음 → 결과가 실행 기계 TZ에 따라 바뀜. 로컬 KST에서만 통과 | 일치 → H4 |
| 테스트 | 다중 TZ 매트릭스·경계 시각 테스트 없음 → CI 전까지 결함 미발견 | 일치 → H4 |
| 테스트 | vitest 기본 수집 범위가 백업 사본까지 포함할 수 있음 (reproduction.md: `TZ=UTC npx vitest run`에서 "4 failed; 2 test files") | 버그 원인 아님. 검증 결과를 오염시키는 기여 요인 → H4 부가 실험 |
| 프로세스 | 로컬과 CI의 실행 환경(TZ) 차이를 문서화·고정하는 단계가 없음. "로컬에서 통과"가 CI 통과를 보장한다는 암묵 가정 | 일치 (blameless) |
| 프로세스 | 시간 처리 코드에 대한 리뷰 기준(로컬 getter 금지, 업무 TZ 명시) 부재 | 일치 (blameless) |

## 2. 가설 5개

구분: **직접 원인** = 잘못된 값을 만들어 낸 코드 / **기여 요인** = 결함을 드러내거나 숨긴 조건

### H1. [직접 원인] `businessDate`가 업무 시간대가 아닌 프로세스 로컬 TZ로 달력 날짜를 계산한다

- 맞다면 관찰돼야 할 것: `businessDate` 결과가 `TZ` 값에 따라 바뀐다. UTC 이하 오프셋 TZ(UTC, America/*)에서 `2026-10-31`, UTC+9 이상(Asia/Seoul, Asia/Tokyo, Pacific/Kiritimati)에서 `2026-11-01`. 같은 Date에 `Intl.DateTimeFormat(..., {timeZone:'Asia/Seoul'})`을 쓰면 TZ와 무관하게 `2026-11-01`.
- 관찰되면 안 될 것: TZ를 바꿔도 결과가 고정됨. 또는 Seoul 고정 포맷도 TZ=UTC에서 `2026-10-31`을 냄.
- 반증 실험:
  ```bash
  for tz in UTC America/Los_Angeles Asia/Seoul Asia/Tokyo Pacific/Kiritimati; do TZ=$tz node --input-type=module -e "import {businessDate} from './src/settlement.js'; const d=new Date('2026-11-01T00:30:00+09:00'); console.log(process.env.TZ, businessDate('2026-11-01T00:30:00+09:00'), new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(d))"; done
  ```
- 판정:
  - 지지: 2열이 UTC/LA에서 `2026-10-31`, Seoul/Tokyo/Kiritimati에서 `2026-11-01`이고, 3열은 5행 모두 `2026-11-01`.
  - 반증: 2열이 5행 모두 같음, 또는 3열이 TZ에 따라 바뀜(→ Date 파싱 자체 문제로 재조사).
- 지지 증거: 재현 3/3, CI 값 = TZ=UTC 값, 코드에 TZ 지정 없음 (`src/settlement.js:3-6`).
- 반대 증거: 없음.

### H2. [기여 요인·트리거] CI 컨테이너의 빈 `TZ=`가 UTC로 해석되어 결함이 드러났다

- 맞다면 관찰돼야 할 것: Linux node 20.18.0에서 `TZ=`(빈 값)일 때 resolved timeZone이 `UTC`(또는 `Etc/UTC`), offset `0`, `businessDate` = `2026-10-31`.
- 관찰되면 안 될 것: 빈 TZ에서 UTC가 아닌 시간대가 나오는데 CI는 실패함 (그렇다면 CI 실패를 TZ로 설명할 수 없음).
- 반증 실험 (Docker로 CI 근사, Windows 빈 TZ 폴백 회피):
  ```bash
  docker run --rm -e TZ= -e LANG=C.UTF-8 -v "$(pwd -W 2>/dev/null || pwd)":/app -w /app node:20.18.0 node --input-type=module -e "import {businessDate} from './src/settlement.js'; console.log(Intl.DateTimeFormat().resolvedOptions().timeZone, new Date().getTimezoneOffset(), businessDate('2026-11-01T00:30:00+09:00'))"
  ```
  - Docker가 없다면 대체안: CI 파이프라인 `npm test` 앞에 `node -e "console.log(Intl.DateTimeFormat().resolvedOptions().timeZone, new Date().getTimezoneOffset())"` 한 줄을 넣어 1회 실행 (CI 설정 변경이므로 오케스트레이터 승인 필요).
- 판정:
  - 지지: `UTC 0 2026-10-31` (또는 `Etc/UTC 0 2026-10-31`).
  - 반증: 시간대가 UTC가 아니거나 offset이 0이 아닌데 결과가 `2026-10-31` → TZ 외 원인 재조사.
- 지지 증거: ci.log `TZ=` 빈 값, CI 실패값이 TZ=UTC 실측값과 일치.
- 반대 증거: CI 시스템 시간대가 로그에 직접 찍히지 않음 (추정 단계).

### H3. [기여 요인 후보, 제거 대상] node 버전(v20/v22)·LANG·vitest 버전 차이가 결과를 바꾼다

- 맞다면 관찰돼야 할 것: TZ를 고정해도 node 버전이나 LANG을 바꾸면 결과가 달라짐.
- 관찰되면 안 될 것: 같은 TZ에서 node 버전·LANG과 무관하게 결과가 같음.
- 반증 실험:
  ```bash
  for v in 20.18.0 22; do for l in C.UTF-8 en_US.UTF-8; do for tz in UTC Asia/Seoul; do echo -n "node$v LANG=$l TZ=$tz -> "; LANG=$l TZ=$tz npx -y node@$v --input-type=module -e "import {businessDate} from './src/settlement.js'; console.log(businessDate('2026-11-01T00:30:00+09:00'))"; done; done; done
  ```
- 판정:
  - 반증(가설 제거): 모든 행에서 TZ=UTC → `2026-10-31`, TZ=Asia/Seoul → `2026-11-01`. node·LANG은 결과에 영향 없음.
  - 지지: 같은 TZ인데 node 버전 또는 LANG에 따라 결과가 다른 행이 있음.
- 지지 증거: CI와 로컬의 node·LANG이 실제로 다름 (log-analysis 비교표).
- 반대 증거: 오케스트레이터 요약 "node 버전 무관". `getFullYear/getMonth/getDate`는 로케일을 참조하지 않음. TZ 한 변수만으로 CI 값이 그대로 재현됨.

### H4. [기여 요인·시스템이 허용한 이유] 테스트가 TZ를 고정하지 않아 결과가 실행 기계에 좌우되고, 로컬(KST)에서 결함이 가려졌다

- 맞다면 관찰돼야 할 것: 같은 테스트 파일이 `TZ=Asia/Seoul`에서 2/2 통과, `TZ=UTC`에서 2/2 실패. vitest 설정·테스트 setup 어디에도 `process.env.TZ` 고정 없음.
- 관찰되면 안 될 것: TZ와 무관하게 테스트 결과가 같음 (테스트가 이미 TZ를 고정하고 있다는 뜻).
- 반증 실험:
  ```bash
  TZ=Asia/Seoul npx vitest run tests/settlement.test.js; echo "seoul exit=$?"; TZ=UTC npx vitest run tests/settlement.test.js; echo "utc exit=$?"
  ```
  - 부가 (검증 오염 확인, reproduction.md의 "4 failed; 2 test files"): `TZ=UTC npx vitest run --reporter=verbose 2>&1 | grep -E "FAIL|✓|×|Test Files"` 로 수집된 파일 경로에 `tests/` 밖(백업 사본 등)이 있는지 확인.
- 판정:
  - 지지: `seoul exit=0`, `utc exit=1` (2 failed). 부가 실험에서 `tests/settlement.test.js` 외 파일이 잡히면 "검증 범위 오염" 기여 요인도 확인.
  - 반증: 두 exit가 같음.
- 지지 증거: 테스트 파일·package.json에 TZ 고정 없음, vitest 설정 파일 없음, 개발자 "로컬에서 전부 통과" + CI 실패.
- 반대 증거: 없음.

### H5. [기여 요인·잠재 확산] 업무 기준 시간대가 명세·코드 어디에도 없어, 같은 결함 계열이 형제 함수(`issuedOn`)에도 있다

- 맞다면 관찰돼야 할 것: `issuedOn('2026-11-01T00:30:00+09:00')`이 TZ=UTC에서 `2026.10.31`, TZ=Asia/Seoul에서 `2026.11.1`. 저장소에 업무 시간대 상수/설정/문서가 없음.
- 관찰되면 안 될 것: `issuedOn`이 TZ와 무관하게 같은 값 → 결함이 `settlement.js`에 국한.
- 반증 실험:
  ```bash
  for tz in UTC Asia/Seoul; do TZ=$tz node --input-type=module -e "import {issuedOn} from './src/invoice.js'; console.log(process.env.TZ, issuedOn('2026-11-01T00:30:00+09:00'))"; done; grep -rniE "Asia/Seoul|timeZone|KST|\+09:00" --include=*.js --include=*.md --include=*.json --exclude-dir=node_modules --exclude-dir=_workspace .
  ```
- 판정:
  - 지지: `UTC 2026.10.31`, `Asia/Seoul 2026.11.1`, 그리고 grep에서 테스트 입력 문자열 외에 업무 TZ 정의가 없음.
  - 반증: `issuedOn`이 두 TZ에서 같은 값, 또는 업무 TZ 상수/명세가 발견됨 (그렇다면 "정의는 있으나 코드가 안 씀"으로 재분류).
- 지지 증거: `src/invoice.js:3-4`가 같은 로컬 getter 패턴. report·BUG-001.md·코드 어디에도 업무 TZ 언급 없음 (테스트 이름 "한국 시간 자정 직후"가 유일한 암묵적 명세).
- 반대 증거: `issuedOn`은 이번 CI 실패에 포함되지 않음 (테스트가 없어서일 가능성).
- 비고: fixer가 `businessDate`만 고치면 `issuedOn`이 그대로 남는다. 수정은 공통 지점(업무 TZ 기반 날짜 추출 1곳)으로 모으는 것이 맞다.

## 3. 우선순위

| 순위 | 가설 | 구분 | 증거 일치도 | 확인 비용 | 근거 |
|---|---|---|---|---|---|
| 1 | H1 로컬 TZ getter | 직접 원인 | 높음 (재현 3/3, CI값 일치, 코드 확인) | 낮음 (node 1줄 루프) | 반대 증거 없음 |
| 2 | H4 테스트 TZ 미고정 | 기여 (결함 은폐) | 높음 (설정·테스트에 TZ 고정 없음, 로컬 통과/CI 실패) | 낮음 | 반대 증거 없음 |
| 3 | H2 CI 빈 TZ → UTC | 기여 (트리거) | 중상 (값 일치, 직접 관측 없음) | 중 (Docker 또는 CI 1회) | CI TZ 미관측 |
| 4 | H5 업무 TZ 명세 부재 + `issuedOn` 확산 | 기여 (설계/범위) | 중 (코드 패턴 동일, 실패 기록 없음) | 낮음 | 이번 실패와 직접 연결 안 됨 |
| 5 | H3 node·LANG·vitest 차이 | 제거 대상 | 낮음 (반대 증거 다수) | 낮음~중 (npx node 다운로드) | 요약상 버전 무관 |

실행 권장 순서: H1 → H4 → H5 (모두 로컬 저비용) → H2 (Docker 가능 시) → H3 (확인 차원).

## 4. 시스템이 왜 이 결과를 허용했나 (blameless)

1. **업무 기준 시간대가 정의되지 않았다.** "정산 날짜는 Asia/Seoul 달력 기준"이라는 규칙이 명세·상수·코드 어디에도 없다. 테스트 이름에만 암묵적으로 들어 있다. 그래서 코드는 "실행 기계의 시간대"를 기본값으로 삼았고, 이를 막을 기준이 없었다.
2. **JS `Date` 로컬 getter의 기본 동작이 실행 환경에 묶여 있다.** 같은 코드가 기계마다 다른 값을 내는데, 언어 차원에서 경고가 없다. 리뷰 체크리스트·린트 규칙에도 막는 장치가 없었다.
3. **테스트가 환경을 고정하지 않았다.** 테스트 결과가 실행자 TZ의 함수였다. 개발 기계가 모두 KST라면 로컬 테스트는 구조적으로 결함을 잡을 수 없다.
4. **로컬과 CI의 환경 차이가 드러나지 않았다.** CI 로그에 시스템 시간대가 찍히지 않고, 빈 `TZ=`의 해석이 OS마다 다르다(Windows=시스템 TZ, Linux=UTC). "로컬 통과 = CI 통과"라는 가정을 검증할 장치가 없었다.
5. **테스트 입력이 우연히 경계 구간을 짚었기에 발견됐다.** KST 00:00~08:59 이외 입력이었다면 CI에서도 통과해 운영에서 처음 드러났을 것이다. 경계 시각 테스트는 의도된 설계가 아니었다.
6. **(검증 위생)** vitest 수집 범위가 백업 사본까지 잡을 수 있어(reproduction.md "2 test files") 수정 후 검증 결과가 오염될 위험이 있다. 검증 시 대상 파일을 명시해야 한다.

## 5. fixer에게 넘길 함의 (수정 지시 아님)

- 직접 원인(H1)과 형제 호출부(H5)를 한 곳에서 해결: 업무 TZ를 상수로 명시하고 `Intl.DateTimeFormat(..., {timeZone})` 기반으로 날짜를 뽑는 공통 지점 하나.
- 검증: `bash _workspace/bug-001/reproduction.sh` exit 0 + H4 실험의 두 TZ 모두 exit 0 + H1 실험 5개 TZ 모두 `2026-11-01`.
