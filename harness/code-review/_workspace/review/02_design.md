# 설계 검토 보고서

대상: D:/common_tester (HEAD 8d840ed), PR diff 없이 프로젝트 전체를 검토함. scope.md 목록 25개 파일이 대상이다.
방법: 경계마다 양쪽 파일을 함께 열어 대조했다. 사용 도구는 Read/Grep/Glob뿐이며 편집은 0건이다.
요약: P0 0건, P1 3건, P2 11건. 역방향 의존(infra → domain)이나 순환 import는 확인되지 않았다.

## 발견

### [P1] api/core.py:178-187 ↔ api/workflow.py:64-72 — 경계면 불일치 (같은 "임베딩 최신 여부" 판정을 두 곳에서 다르게 함)
근거:
- core.list_products (UI의 `indexed` 값):
  - 현재 폴더의 **모든** 원문 파일 해시가 저장된 해시와 같은지 비교한다: `current_hashes == stored_hashes` (core.py:178-181, 187).
  - `metadata.chunking`만 확인하고 `model`은 보지 않는다 (core.py:187).
- workflow._requirements (`/api/runs`, `/api/handoffs` 진입 시 prepare_pipeline:460에서 호출):
  - **저장된 파일 목록만** 다시 해시해서 비교한다: `for relative in stored_hashes` (workflow.py:67-69).
  - `chunking`과 `model`을 둘 다 확인한다 (workflow.py:64).
- 결과 1: 임베딩 후 새 원문 파일을 추가하면, UI는 '임베딩 필요'로 표시하고 시작 버튼을 막는다 (App.tsx:124 `!current?.indexed`). 그런데 API는 옛 벡터로 실행을 받아준다. 새 파일의 요구사항은 조용히 빠진다.
- 결과 2: MODEL_NAME만 바뀌면, UI는 '준비됨'으로 표시하지만 API는 400으로 거부한다.
권장: core에 `index_status(path)` 같은 함수를 하나 두고 두 곳이 같이 쓰게 한다.

### [P1] api/playwright_runner.py:164-168 ↔ api/results.py:48,72 ↔ web/src/App.tsx:130,133 — 경계면 불일치 (같은 이름 `failed`가 서로 다른 의미)
근거:
- runner의 `counts.failed`는 Playwright 상태가 `failed`/`timedOut`인 테스트 수다 (playwright_runner.py:167).
- results의 `summary.failed`는 `verdict == "failed"`인 수다. 여기에는 정책 불일치(FN/FP)와 `capture_error`도 들어간다 (results.py:47-48, 72).
- App 실행 선택 드롭다운은 `{item.counts.passed} 통과, {item.counts.failed} 실패`를 보여준다 (App.tsx:130).
- 같은 화면의 요약 영역은 `${summary.failed}개 점검 실패`를 보여준다 (App.tsx:133).
- 그래서 정책이 FN인 실행이 드롭다운에서는 "6 통과, 0 실패", 요약에서는 "1개 점검 실패"로 동시에 표시될 수 있다. README가 강조한 "두 판정을 섞지 않는다"는 원칙과 달리 UI가 같은 라벨 '실패'로 섞어서 보여준다.
- `Execution.summary`가 이미 내려오는데도 (results.py:104-105, App.tsx:5) 쓰지 않는다.
권장: 드롭다운도 `summary`를 쓰거나 라벨을 "Playwright 실패"로 구분한다. 필드 이름도 `test_failed`와 `failed`로 나눈다.

### [P1] api/playwright_runner.py:113 ↔ api/results.py:48-49 — 상태 전이 누락 (`skipped`가 `passed`로 판정될 수 있음)
근거:
- runner에서 결과가 없으면 기본값이 `"skipped"`이고 (playwright_runner.py:113), `test.skip` 상태도 그대로 넘어간다.
- results의 `failed` 조건은 `status in {"failed","timedOut"}`이고, infra 조건은 `{"interrupted","timedOut"}`이다. 둘 다 `skipped`를 다루지 않는다 (results.py:42, 48).
- verdict는 "실패가 아님 + quadrant 있음"이면 `passed`가 된다 (results.py:49). Playwright 통과 여부는 조건에 없다.
- playwright-observations.ts:9-35의 관찰 fixture는 테스트가 skip되어도 finally에서 관찰을 첨부한다. 예를 들어 `kind: disabled` 버튼은 초기 화면에서도 deny로 읽힐 수 있다.
- 따라서 skip된 deny 상황이 TN과 verdict `passed`가 되어 UI '통과'로 집계될 수 있다.
- 프롬프트는 test.skip을 금지하지만 (codex_generator.py:165), 생성 파일 검사는 `"test("`가 들어 있는지만 본다 (codex_generator.py:193). 강제되지 않는다.
권장: `test_status != "passed"`이면 `passed` verdict를 주지 않는다. `skipped`는 별도 verdict나 execution_error로 처리한다.

### [P2] api/workflow.py:381,451,464,480 ↔ api/playwright_runner.py:18-34 ↔ api/codex_generator.py:16-17,142 ↔ api/results.py:131-132 — 책임 분리 (실행 저장소 경로와 ID 검증이 4개 모듈에 중복)
근거:
- `.local/runs/<run_id>` 경로 검증은 `run_folder()`(playwright_runner.py:18-24)에 있다.
- 그런데 workflow는 같은 경로를 4번 직접 조립한다 (summarize_results:381, _finish_status:451, prepare_pipeline:464, interrupt_pending_runs:480). 같은 파일의 _progress:372만 run_folder를 쓴다.
- codex_generator는 `RUN_ID_PATTERN`과 경로를 따로 정의하고, run_folder의 is_dir/relative 검증을 거치지 않는다 (codex_generator.py:17, 140-142).
- results.list_runs도 정규식을 따로 쓴다 (results.py:132).
- `ROOT`가 core:18, workflow:23, playwright_runner:15, codex_generator:16, page_inspector:10에 다섯 번 재정의되어 있다.
- 경로 도우미가 Playwright 실행 모듈에 들어 있어서, 리포트 모듈(results.py:9)과 워크플로(workflow.py:19)가 경로 하나 때문에 runner에 의존한다.
권장: run 저장소 함수(run_folder, execution_folder, save_json, ROOT)를 core나 별도 모듈 하나로 모은다.

### [P2] api/workflow.py:383,422,434,474 ↔ api/codex_generator.py:250 ↔ api/results.py:123 ↔ web/src/App.tsx:14 — 상태 전이 / 명명 일관성 (최종 상태를 쓰는 주체가 여러 곳)
근거:
- 성공 시 최종 상태를 쓰는 방식이 경로마다 다르다.
  - 전체 파이프라인: summarize_results 노드가 쓰고 (workflow.py:383), execute_pipeline이 같은 값을 한 번 더 쓴다 (workflow.py:474).
  - run_execution: 노드에만 맡긴다 (workflow.py:438-447).
  - run_handoff / run_generation: 직접 `_finish_status`를 호출한다 (workflow.py:422, 434).
- 같은 단계의 이름이 서로 다르다.
  - run_handoff는 API 응답으로 `"status": "ready"`를 주지만, 파이프라인 상태는 `"handoff"`로 저장한다 (workflow.py:422-423).
  - generation.json의 상태는 `"ready"`/`"unsupported"`인데 (codex_generator.py:250), 파이프라인에는 항상 `"generated"`가 저장된다 (workflow.py:434).
  - run_detail은 generation.json의 상태를 노출하지 않는다 (results.py:116-125).
- App의 `statusNames.unsupported: '해당 화면 없음'`(App.tsx:14)은 run.status로 도달할 경로가 없는 죽은 키다. 모든 상황이 미지원이어도 '코드 준비'로 표시된다.
권장: 최종 상태 기록은 한 곳(그래프의 마지막 노드나 래퍼)으로 정하고, 상태 어휘를 enum 하나로 고정한다.

### [P2] api/main.py:95-101 ↔ api/results.py:89 ↔ api/workflow.py:489-497 — API ↔ 워크플로 매핑 (GET 요청의 부작용, 그래프 우회, 죽은 코드)
근거:
- `GET /executions/{id}/report`는 report.json이 없으면 `summarize_results(..., publish=False)`를 호출한다 (main.py:99).
- 이 함수는 publish 값과 상관없이 `report.json`을 디스크에 쓴다 (results.py:89). 즉 GET이 쓰기를 한다.
- 이 경로는 LangGraph 노드를 거치지 않는다. 그래프 경유용으로 만든 `run_summary`(workflow.py:494)와 `run_pipeline`(workflow.py:489)은 호출하는 곳이 없다. api/와 web/을 Grep으로 확인했고 정의만 나온다.
권장: GET에서는 계산만 하고 쓰지 않게 하거나, 쓰기를 명시적인 POST로 옮긴다. 사용하지 않는 함수는 삭제한다.

### [P2] api/main.py:72-79 ↔ api/main.py:104-113 ↔ web/src/App.tsx:93-100 — 즉시응답 ↔ 비동기 불일치
근거:
- `/api/runs`는 202를 반환하고 BackgroundTasks로 실행한다 (main.py:72-77).
- 같은 일을 하는 다른 엔드포인트들은 요청 스레드 안에서 동기로 끝까지 실행한다.
  - `/execute`: Playwright 최대 300초에 urlopen 10초 추가 (playwright_runner.py:80, 96).
  - `/generate-playwright`: Codex 최대 900초 (codex_generator.py:21).
  - `/handoffs`: OpenAI 180초 × 재시도 × 묶음 수 (workflow.py:254, 304-308).
- App의 rerun은 이 동기 요청을 기다린다 (App.tsx:97).
- 같은 run_id의 동시 실행을 막는 장치는 UI의 `running` 버튼 비활성화(App.tsx:130)뿐이다. 서버에는 잠금이 없다. [cross:static-analyzer]
권장: 실행 계열 엔드포인트를 202 + 폴링 방식으로 통일하고, run 단위 실행 중 상태를 서버에서 검사한다.

### [P2] web/src/App.tsx:18-22 ↔ api/main.py:43,49-54,78 / api/core.py:137 — 상태 전이 누락 (500 응답 처리)
근거:
- App은 `response.ok`를 확인하기 전에 `response.json()`부터 호출한다 (App.tsx:20).
- main.py의 예외 매핑이 엔드포인트마다 다르다.
  - `/handoffs`는 OSError를 잡지 않는다 (main.py:49-54). `/runs`는 잡는다 (main.py:78). prepare_pipeline의 파일 해시 단계(workflow.py:68)에서 FileNotFoundError가 날 수 있는데 `/handoffs`에서는 500이 된다.
  - `/index`는 core.py:137의 RuntimeError를 잡지 않는다 (main.py:43).
- 처리되지 않은 500은 FastAPI가 text/plain으로 반환한다. 그러면 UI는 실제 오류 대신 JSON 파싱 오류 메시지를 보여준다.
권장: api()에서 content-type을 확인하거나 `.json().catch()` 대체 처리를 넣는다. 서버에는 공통 예외 핸들러를 둔다.

### [P2] api/results.py:87 ↔ api/playwright_runner.py:97,156-158 — 파일경로 ↔ 링크 변환 (없는 파일로 가는 링크)
근거:
- report.artifacts는 `execution.json`, `failures.json`, `playwright-results.json`, `playwright.log`를 무조건 링크로 만든다 (results.py:87).
- runner는 `files`가 없으면(`not_run`) playwright.log와 results.json을 만들지 않는다 (playwright_runner.py:157-158). 실행 전 예외에서도 마찬가지다 (playwright_runner.py:80-85).
- 반대로 실제로 만드는 `launch-error.txt`(playwright_runner.py:156)는 링크가 없다.
- 그래서 App.tsx:137의 다운로드 링크가 404가 된다.
권장: 실제로 존재하는 파일만 artifacts에 넣는다.

### [P2] api/workflow.py:24,90 ↔ scripts/import_product_pdf.py:12-15,94 — 책임 분리 (제품 전용 상수가 범용 워크플로에 있음)
근거:
- 범용 검색 노드에 product/v1 전용 섹션 목록 `SECTIONS`가 하드코딩되어 있다 (workflow.py:24). 변환 스크립트(import_product_pdf.py:12-15)에 같은 값이 중복되어 있다.
- `^(BE_[A-Z0-9_]+)` 접두사도 하드코딩되어 있다 (workflow.py:90).
- 다른 제품(예: portfolio)의 `## 섹션`은 scope로 입력해도 섹션 필터가 아닌 자유 검색으로 처리된다 (workflow.py:140 → 144).
권장: 섹션은 문서의 `##` 제목에서 동적으로 모은다. 상수는 변환 스크립트와 한 곳에서 공유한다.

### [P2] api/workflow.py:113,334 ↔ api/playwright_runner.py:107 ↔ playwright-observations.ts:12 — 경계면 불일치 (scenario_key 구분자, 잠재적)
근거:
- requirement_key에 원문의 상대 파일 경로가 들어간다: `f"{requirement_id}@{path}:{paragraph_no}"` (workflow.py:113).
- core.source_files는 파일명에 제한이 없다 (core.py:37-41). NAME 정규식은 product/version에만 적용된다.
- 소비하는 양쪽은 모두 "첫 공백 앞까지"를 scenario_key로 본다 (playwright_runner.py:107 `split(" ", 1)[0]`, observations.ts:12 `split(' ')[0]`).
- 파일명에 공백이 있으면 runner가 "명세에 없는 테스트" RuntimeError를 내고 실행이 전부 실패한다.
권장: 키 생성 시 path를 정규화(공백 금지 또는 치환)하거나, 제목 구분 규칙을 명시적인 구분자로 바꾼다.

### [P2] api/codex_generator.py:161-162 ↔ scripts/inspect-page.cjs:41,44-45 — 계약 중복 (산출 파일명)
근거:
- inspect-page는 저장한 파일명을 `metadata.html_file`/`reference_file`로 돌려준다 (inspect-page.cjs:41).
- 그런데 codex_generator는 반환값(reference_metadata, codex_generator.py:156)을 무시하고 `"target-page.html"`/`"target-page.json"`을 하드코딩한다 (codex_generator.py:161-162).
권장: 반환된 metadata의 파일명을 사용한다.

### [P2] api/codex_generator.py:205-206 ↔ api/playwright_runner.py:95-96 — 일관성 (Playwright 호출 방식이 둘)
근거:
- 목록 확인은 `node_modules/.bin/playwright.cmd`를 문자열 명령과 `shell=True`로 실행한다. Windows 전용이다 (codex_generator.py:205-206).
- 실제 실행은 `node …/@playwright/test/cli.js`를 리스트 인자로 실행한다 (playwright_runner.py:95-96).
- 같은 도구를 두 방식으로 부르고 있어서 플랫폼 이식성과 셸 경유 여부가 다르다. [cross:security] (경로는 ROOT에서 만들어지므로 사용자 입력은 아님)
권장: runner 방식(node + cli.js, shell=False)으로 통일한다.

### [P2] api/results.py:16-22 ↔ api/playwright_runner.py:177 / api/codex_generator.py:263 / api/workflow.py:178,368 — 일관성 (원자적 쓰기 혼용)
근거:
- pipeline.json과 report.json은 임시 파일을 쓴 뒤 교체하는 `save_json`을 쓴다.
- execution.json, generation.json, evidence.json, test-spec.json은 `write_text`로 바로 쓴다.
- list_runs/execution_summaries는 폴링(3초) 중에 이 파일들을 읽는다 (results.py:100-107). 쓰는 도중이면 ValueError로 조용히 건너뛰어서 목록에서 잠깐 사라질 수 있다.
권장: run 폴더의 JSON은 모두 save_json으로 쓴다.

## 확인했지만 문제 없음
- observation 첨부: observations.ts:34가 Buffer로 넣고 Playwright JSON reporter가 base64로 내보낸다. playwright_runner.py:121의 b64decode와 scenario_key 대조로 짝이 맞는다.
- App의 `Report`/`Case`/`Summary` 타입과 results.py:50-88 응답 필드 이름이 일치한다. 래핑과 케이스 변환에 불일치가 없다.
- 청크 분할(core.py:84-88, 손실 없는 슬라이스)과 workflow.py:94의 `"".join` 문단 복원이 일치한다.
- import_product_pdf.py:94-98의 출력 형식과 workflow.py:90-92 정규식이 일치한다.

## 자체 검증
- 모든 발견은 두 파일 이상을 교차 비교한 결과이고, 경계면 패턴을 명시했다.
- 호출처 확인: run_summary와 run_pipeline은 Grep 결과 호출처가 없다.
- Edit/Write/Bash 호출은 0건이다.
