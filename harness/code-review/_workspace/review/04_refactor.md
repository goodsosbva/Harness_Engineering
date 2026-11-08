# 리팩토링 patch 제안

대상: D:/common_tester (HEAD 8d840ed). 소스는 수정하지 않았고(`git status` 결과 깨끗함) git commit도 하지 않았습니다. patch 파일만 만들었습니다.

## 적용된 patch

### p0-generated-spec-isolation.diff
- 파일 위치: `C:/Users/admin/Desktop/side/harness/code-review/_workspace/patches/p0-generated-spec-isolation.diff`
- 발견 출처: 03_security.md [P0] LLM이 만든 Playwright spec을 격리 없이 호스트 권한으로 실행 (CWE-94, CWE-78/CWE-250). 같은 문제의 P2 두 건도 함께 고쳤습니다.
  - 03_security.md [P2] `shell=True`
  - 02_design.md [P2] Playwright를 부르는 방식이 두 가지임
- 대상 파일과 라인
  - `api/playwright_runner.py`
    - @@ -13 (ROOT 아래): 상수 `CHILD_ENV_KEYS`, `SPEC_IMPORTS`, `SPEC_FORBIDDEN`과 함수 `child_env()`, `check_spec_source()`를 추가합니다.
    - @@ -77..-97 (`run_playwright`): 실행 전에 모든 `*.spec.ts`를 정적 검사합니다. `os.environ.copy()`는 `child_env(...)`로 바꿉니다.
  - `api/codex_generator.py`
    - @@ -11: 위 두 함수를 import합니다.
    - @@ -22 (`CodexAppServer.__init__`): env를 허용 목록 방식으로 바꿉니다. `CODEX_HOME`만 추가로 넘깁니다.
    - @@ -191 (생성 파일 검사 반복문): `check_spec_source()`를 호출합니다. 이 검사는 `--list`보다 먼저 실행되므로, 모듈 최상위 코드가 실행되기 전에 차단됩니다.
    - @@ -197..-206: `--list` 호출을 `[node, cli.js, "test", "--list", "--reporter=line", "--config", ...]` 리스트 인자로 바꾸고 `shell=True`를 없앴습니다. 러너와 같은 방식입니다.
  - `api/check_spec_gate.py` (새 파일): 기존 `check_*.py`와 같은 assert 방식의 자체 검증 스크립트입니다.
- 변경 요지
  1. **env 허용 목록**: 하위 프로세스에는 PATH와 SYSTEMROOT 같은 Windows 필수 항목, 프록시와 CA 설정, `PLAYWRIGHT_BROWSERS_PATH`, 그리고 `COMMON_TESTER_*`만 넘깁니다. 기존에는 `OPENAI_API_KEY` 하나만 빼는 거부 목록 방식이었습니다.
  2. **정적 게이트**
     - import는 `@playwright/test`와 `../../../../playwright-observations`만 허용합니다.
     - 다음 사용은 거부합니다: `require`, `eval`, `Function`, `constructor`, `globalThis`, `child_process`, `fs`, `fetch`, `Buffer`, 동적 `import()`, `\u` 식별자 이스케이프.
     - `process`는 `process.env.COMMON_TESTER_TARGET_URL` 한 가지 형태만 허용합니다. 프롬프트가 이 형태를 요구하기 때문입니다.
     - 예외로 TS 타입 표기 `import('@playwright/test').Page`는 허용합니다.
     - 게이트는 생성 단계(`--list` 전)와 실행 단계(`run_playwright`) 양쪽에 둡니다. 생성 후 디스크에서 파일이 바뀌는 경우까지 막기 위해서입니다.
  3. **`shell=True` 제거**: `--list`도 `node cli.js` 리스트 인자로 호출해 러너와 통일했습니다.
- 검증
  - `git -C D:/common_tester apply --check -v <patch>`: **1회차 통과** (exit 0). 3개 파일 모두 "Checking patch ... " 이후 오류가 없습니다.
  - patch를 적용한 사본에서 `py_compile`, `import codex_generator, playwright_runner`, `check_spec_gate.py`가 모두 통과했습니다. 악성 예시 10건은 모두 거부되었습니다.
  - 기존 생성 spec 7건(`D:/common_tester/.local/runs/*/generated-tests/*.spec.ts`)에 게이트를 돌렸습니다. 1차에서 2건이 오탐이었는데, 원인은 TS 타입 표기 `import('@playwright/test')`였습니다. 이 형태만 예외로 두도록 고친 뒤 0건 거부입니다. 생성-검증 루프는 2회로, 상한 3회 이내입니다.
  - 리뷰어 3인 재검증은 이 실행 환경에서 SendMessage 경로가 없어 하지 못했습니다. 오케스트레이터가 security-auditor 재검토를 요청해야 합니다.
- 알려진 한계
  - 게이트는 정규식 거부 목록이라 난독화하면 우회할 수 있습니다. 코드에 `ponytail:` 주석으로 이 한계를 명시했습니다.
  - Node 프로세스는 여전히 같은 사용자 권한으로 `ROOT/.env`를 파일로 읽을 수 있습니다. 이 patch는 위험을 줄일 뿐 격리하지는 않습니다.
  - 저장소 작업본은 CRLF, index는 LF이고 `core.autocrlf=input`입니다. patch는 LF로 만들었고 `--check`는 통과했습니다. 다만 실제로 적용하면 수정된 줄만 LF가 될 수 있으니 적용 후 줄바꿈을 확인해야 합니다.

## 상충 해소 메모
- 02_design의 P2(호출 방식 통일)와 03_security의 P2(`shell=True` 제거)는 같은 지점을 가리킵니다. P0 patch에 함께 넣었습니다. 상충은 없습니다.
- 02_design P2는 실행 저장소와 경로 도우미가 runner 모듈에 몰려 있다고 지적했습니다. 이번 patch는 `child_env`, `check_spec_source`를 `playwright_runner.py`에 두어 이 의존 방향을 더 늘립니다.
  - trade-off: 파일 수를 최소로 하려고 이 위치를 선택했습니다. 다음 PR에서 run 저장소 모듈을 분리할 때 함께 옮기는 것을 권합니다.
- 01_static.md(haiku 모델)는 도구 출력(py_compile, tsc 통과) 외 발견이 없습니다. patch에 반영한 내용은 없습니다.

## 다음 PR 권고
(3개 보고서에서 중복을 합쳤습니다. 중요도 순입니다.)

**보안 P0의 근본 해결 (patch 범위 밖)**
- 생성 코드 실행을 컨테이너나 저권한 별도 계정으로 격리합니다.
  - 네트워크는 대상 origin 외에는 막습니다.
  - 호스트 파일시스템은 읽기 전용으로 두고 `.env`가 보이지 않게 합니다.
  - `--list`부터 실행까지 같은 격리 안에서 돌립니다.
- 실행 전에 사람이 승인하는 단계를 둡니다. 생성 코드를 UI에서 확인하고 승인 버튼을 누르는 방식입니다. (03_security P0 권장, cross:design)

**P1**
- **[강조] `skipped`가 `passed`로 판정됨** (02_design P1, playwright_runner.py:113 ↔ results.py:48-49)
  - skip된 deny 시나리오가 TN과 verdict `passed`로 집계되어 거짓 통과가 납니다.
  - 프롬프트는 `test.skip`을 금지하지만 코드로 강제하지 않습니다.
  - 권장 1: `test_status != "passed"`이면 `passed`를 주지 않고, `skipped`는 별도 verdict나 `execution_error`로 처리합니다.
  - 권장 2: 이번 게이트 `SPEC_FORBIDDEN`에 `test.skip`, `test.fail`, `test.fixme`를 추가합니다. 한 줄로 끝나는 보강이라 함께 넣을 만합니다.
- **무인증 API, CSRF, DNS 리바인딩** (03_security P1, main.py)
  - `TrustedHostMiddleware`(127.0.0.1, localhost)를 적용합니다.
  - Origin 허용 목록이나 고정 토큰 헤더를 검사합니다.
  - `application/json`이 아닌 요청은 거부합니다.
  - 이 항목이 막혀야 P0 경로를 외부에서 구동할 수 없게 됩니다.
- **대상 URL SSRF** (03_security P1, target_url.py, inspect-page.cjs, playwright_runner.py:80)
  - 허용 origin을 설정 파일로 관리하거나, DNS 해석 후 169.254.0.0/16과 사설망을 opt-in으로 바꿉니다.
  - 리다이렉트할 때마다 다시 검증합니다.
- **산출물 서빙 XSS** (03_security P1, main.py:124-131)
  - `FileResponse`를 허용 확장자로 제한합니다.
  - `Content-Disposition: attachment`와 `nosniff`를 붙입니다.
- **임베딩 최신 여부 판정이 두 곳에서 다름** (02_design P1, core.py:178 ↔ workflow.py:64)
  - `index_status()` 함수 하나로 통일합니다.
- **`failed`라는 이름이 두 의미로 쓰임** (02_design P1, runner counts ↔ results summary ↔ App.tsx:130,133)
  - 드롭다운도 `summary`를 쓰게 하고, 필드를 `test_failed`와 `failed`로 나눕니다.

**P2**
- 하위 프로세스 env 허용 목록을 `page_inspector.py:19`에도 적용합니다. 이번 patch의 `child_env` 재사용으로 한 줄이면 됩니다. (03_security)
- 보고서 JSON을 생성 코드가 덮어써서 판정을 위조할 수 있습니다. 보고서는 러너 프로세스 바깥 채널로 받습니다. (03_security P2)
- `detail=str(error)`와 로그 일부가 그대로 노출됩니다. 클라이언트에는 일반 메시지와 오류 ID만 줍니다. (03_security P2)
- DOCX 파싱은 `defusedxml`을 쓰거나 실제 압축 해제 크기를 제한합니다. (03_security P2)
- pip-audit를 CI에 넣고 해시를 고정합니다. (03_security P2)
- run 저장소, 경로, ID 검증, `ROOT`가 4~5개 모듈에 중복되어 있습니다. 모듈 하나로 모으고, 이번 patch의 helper도 함께 옮깁니다. (02_design P2)
- 최종 상태를 쓰는 주체가 여러 곳이고 상태 어휘가 불일치합니다. `unsupported` 키는 죽은 키입니다. (02_design P2)
- GET `/report`가 디스크에 씁니다. `run_summary`와 `run_pipeline`은 호출처가 없으니 삭제합니다. (02_design P2)
- 실행 계열 엔드포인트가 동기와 비동기로 섞여 있고, 서버에 run 단위 잠금이 없습니다. 202 + 폴링으로 통일합니다. (02_design P2)
- App이 `response.ok`보다 `.json()`을 먼저 호출해서 500이 오면 파싱 오류가 납니다. 서버에 공통 예외 핸들러를 둡니다. (02_design P2)
- 존재하지 않는 파일로 가는 artifacts 링크가 생기고, `launch-error.txt`는 링크가 없습니다. (02_design P2)
- `SECTIONS`와 `BE_` 접두사가 범용 워크플로에 하드코딩되어 있습니다. (02_design P2)
- 파일명에 공백이 있으면 scenario_key 구분이 깨집니다. (02_design P2)
- codex_generator가 inspect-page가 돌려준 파일명을 무시합니다. (02_design P2)
- run 폴더 JSON은 모두 원자적으로 쓰도록 `save_json`으로 통일합니다. (02_design P2)

**도구**
- eslint와 pyflakes가 없습니다. 린트 스크립트와 dev 의존성을 추가합니다. (01_static P3)
- semgrep과 pip-audit가 없습니다. (03_security)

## 자체 검증 체크리스트
- [x] 수정 대상이 `_workspace/patches/*.diff`에 한정됨 (D:/common_tester 무변경, 중간 작업은 scratchpad 사본에서 함)
- [x] git commit 호출 0건
- [x] 생성-검증 루프 ≤ 3회 (2회, `apply --check` 1회차 통과)
- [x] 모든 patch가 P0 발견에 대응함 (P2 두 건은 같은 코드 지점이라 함께 반영)
- [x] 상충 해소 메모 있음
