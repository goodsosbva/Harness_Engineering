# 보안 감사 보고서

대상: D:/common_tester (HEAD 8d840ed), 전체 코드 리뷰. 편집은 하지 않았다.

## 도구 실행 결과 요약

| 도구 | high | moderate | low | 상태 |
|------|------|----------|-----|------|
| npm audit --omit=dev (루트) | 0 | 0 | 0 | ok (prod 의존성 1개) |
| npm audit --omit=dev (web) | 0 | 0 | 0 | ok (prod 의존성 4개) |
| pip-audit (api/requirements.txt) | - | - | - | 도구 부재 (.venv에 pip_audit 미설치. 전역 설치 금지 규칙에 따라 미설치 유지. 파이썬 의존성 취약점은 미확인) |
| semgrep | - | - | - | 도구 부재 (PATH에 없음. 정규식 Grep과 수동 코드 읽기로 대체) |

- 시크릿 이력 점검: `git log --all --diff-filter=A --name-only`에서 추가된 민감 파일명은 `.env.example` 3건(루트, 1.0.0/, 1.0.0/2.0.0-snapshot/)뿐이다. 실제 `.env`는 추적되지 않고 `.gitignore`의 `.env`, `.env.*`로 제외된다. 값은 출력하지 않았다.
- 소스 하드코딩 시크릿: `api/`, `scripts/`, `web/src/`에서 발견 없음. `OPENAI_API_KEY`는 `api/workflow.py:52,225`에서 환경변수와 .env로만 읽는다.
- 전제: README와 `web/vite.config.ts:4`상 API(127.0.0.1:8000)와 Vite(127.0.0.1)는 로컬호스트에만 바인딩된다. 아래 P0와 P1 중 인증 관련 항목은 이 전제가 깨지는 경우(0.0.0.0 바인딩, 리버스 프록시, 공유 PC)에 위험이 커진다.

## 발견

### [P0] api/codex_generator.py:205-206, api/playwright_runner.py:95-96 — LLM이 생성한 Playwright spec을 격리 없이 호스트 권한으로 실행 (CWE-94, CWE-78/CWE-250)
도구: 수동 코드 분석. semgrep 부재.
근거:
- `generate_playwright`의 프롬프트(codex_generator.py:164-172)에는 "page text는 신뢰할 수 없는 데이터" 같은 자연어 지시만 있다. 이것은 통제 수단이 아니다.
- 입력은 검사 대상 페이지의 HTML과 접근성 스냅샷이다(`inspect-page.cjs:20-45`). 외부 페이지 내용이 LLM 프롬프트에 직접 들어가므로 간접 프롬프트 인젝션 경로가 열려 있다.
- 생성된 `*.spec.ts`는 검증이 `"playwright-observations" in content`와 `"test(" in content` 문자열 포함 확인뿐이다(codex_generator.py:193).
- 곧바로 `playwright test --list`가 실행된다(codex_generator.py:205-206). `--list`도 spec 파일을 로드하므로 모듈 최상위 코드가 실행된다. 이 단계에는 사람의 리뷰나 승인이 없다.
- 이후 `run_playwright`(playwright_runner.py:95-96)가 Node 프로세스로 spec을 실행한다. 이 프로세스는 `os.environ.copy()` 환경(OPENAI_API_KEY만 제거), 현재 사용자 권한, 네트워크와 파일시스템 전체 접근을 가진다.
- 클래스 수준 영향: 악의적인 대상 페이지나 오염된 요구사항 문서가 생성 코드를 조작하면, 호스트에서 임의 파일 읽기와 쓰기, 임의 Node 코드 실행, 내부망 접근, 환경변수 유출이 가능하다.
- 해당 Node 프로세스는 `ROOT/.env`를 직접 읽을 수 있다. env에서 키를 제거해도 파일 접근으로 우회된다.
- 파일 화이트리스트(codex_generator.py:188-190)는 생성 파일명만 검사하고 실행되는 코드의 동작은 검사하지 않는다. Codex 샌드박스 `workspace-write`(:99)는 생성 단계에만 적용되고 실행 단계에는 적용되지 않는다.
권장:
- 생성 코드 실행은 컨테이너나 별도 저권한 계정에서 한다. 네트워크는 대상 origin 외 차단하고, 호스트 파일시스템은 읽기 전용 마운트로 한다.
- 최소한 `--list` 전에 AST나 정적 검사로 import 화이트리스트(`@playwright/test`, `../../../../playwright-observations`만)와 `fs`, `child_process`, `process.env`, `require`, `eval`, `fetch` 사용 금지를 검증한다.
- 실행 env는 화이트리스트 방식(`COMMON_TESTER_*`, PATH 등 필수 항목)으로 구성한다.
- 실행 전 사람의 승인 단계를 둔다.
[cross:design] 신뢰 경계를 넘는 생성 코드 실행 단계의 설계(승인 게이트, 샌드박스 계층)를 짚어 달라.

### [P1] api/main.py:19-133 — 모든 API에 인증, CSRF, CORS 정책이 없고 상태 변경과 외부 호출 엔드포인트가 열려 있음 (CWE-306, CWE-352, CWE-942)
도구: 수동 코드 분석 (Grep 결과 `CORSMiddleware` 및 인증 의존성 없음).
근거:
- `POST /api/handoffs`, `/api/runs`, `/api/runs/{id}/generate-playwright`, `/api/runs/{id}/execute`, `/api/products/.../index`가 무인증이다.
- 이들은 유료 OpenAI 호출, Codex 실행, 헤드리스 브라우저 구동, 위 P0의 코드 실행을 유발한다.
- 로컬호스트 바인딩 환경에서도 사용자가 접속한 임의의 웹페이지가 `fetch('http://127.0.0.1:8000/api/runs', {method:'POST', ...})`를 보낼 수 있다.
- 요청 본문이 `application/json`이면 CORS 사전 요청에서 막히지만 응답만 읽지 못한다. FastAPI는 Content-Type 검증이 느슨해, `text/plain` 단순 요청으로 본문을 보내면 실행 트리거가 가능할 수 있다. 이 부분은 실제 요청으로는 검증하지 않았다.
- DNS 리바인딩도 Host 검증이 없어서 가능성이 있다. 이 부분도 미검증이라 확신도는 중간이다.
- 결과적으로 사용자 브라우저를 경유한 CSRF 형태로 P0 경로가 구동될 수 있다.
권장:
- 로컬 전용 도구라도 고정 토큰 헤더(예: Vite 프록시가 주입하는 값)나 Origin, Host 허용 목록 검사를 둔다.
- `TrustedHostMiddleware`(127.0.0.1, localhost)를 적용한다.
- 다른 Content-Type은 거부한다.

### [P1] api/playwright_runner.py:80, api/page_inspector.py:21 + scripts/inspect-page.cjs:12, api/target_url.py:5-18 — 대상 URL에 대한 SSRF (CWE-918)
도구: 수동 코드 분석.
근거:
- `validate_target_url`은 문법 검사만 한다(스킴 http/https, 호스트 존재, 계정정보 없음). 모듈 docstring도 "connecting 없이"라고 명시한다.
- 호스트 종류는 차단하지 않는다. loopback, 사설망(10/172/192.168), 링크 로컬 169.254.169.254(클라우드 메타데이터), `localhost`, 내부 호스트명이 모두 통과한다.
- 서버는 이 URL로 `urlopen`(playwright_runner.py:80)과 Chromium `page.goto`(inspect-page.cjs:12)를 직접 요청한다.
- 수집된 HTML, 접근성 스냅샷, 링크, 제목이 `target-page.html`/`target-page.json`에 저장되고, LLM 프롬프트에 들어가며, 결과 API로 다운로드된다. 따라서 응답 내용이 요청자에게 되돌아오는 non-blind SSRF다.
- 리다이렉트는 최종 URL을 스킴만 재검증한다(inspect-page.cjs:13, page_inspector.py:28). 공개 URL에서 내부 주소로의 리다이렉트도 통과한다.
- 의도적 기능(로컬 데모 `127.0.0.1:8765`를 대상으로 사용, check_stage6.py:43)이라 단순 차단이 어렵다는 점은 인정한다. 다만 위 P1 무인증과 결합하면 위험하다.
권장:
- 허용 대상 origin을 설정 파일 허용 목록으로 관리한다.
- 또는 DNS 해석 후 IP 대역(link-local, 메타데이터 등)을 거부하고, 리다이렉트 때마다 재검증한다.
- 최소한 169.254.0.0/16과 사설망은 명시적 opt-in으로 한다.

### [P1] api/main.py:124-131 + api/playwright_runner.py:27-34 — 실행 산출물 파일 서빙에서 내용 유형 위험 (CWE-79, CWE-434)
도구: 수동 코드 분석.
근거:
- 경로 순회는 방어되어 있다(양호). run_id와 execution_id를 정규식 `[a-f0-9]{32}`로 제한하고, `resolve().is_relative_to(folder)`와 `is_file()`을 확인한다. `..`와 절대경로로는 실행 폴더 밖을 읽을 수 없음을 코드상 확인했다. 심볼릭 링크는 resolve로 처리된다.
- 문제는 실행 폴더 내용이다. `test-source/*.ts`, `playwright.log`, trace.zip, 첨부 파일 등 LLM이 만들었거나 실행 중 생성된 파일을 `FileResponse`가 확장자 기반 MIME으로 그대로 제공한다.
- 생성 코드(P0)나 `attachments`가 `.html`이나 `.svg` 파일을 execution 폴더 안에 쓰면, 같은 origin(프록시 경유 `/api`)에서 `text/html`로 서빙되어 저장형 XSS가 된다. UI는 download 링크라 직접 노출은 낮지만, URL을 직접 열 수 있다.
- `X-Content-Type-Options: nosniff`와 `Content-Disposition: attachment`가 없다.
권장:
- `FileResponse(file, media_type=...)`를 허용 확장자(png, json, txt, ts, zip) 목록으로 제한한다.
- `content_disposition_type="attachment"`와 `nosniff`를 적용한다.

### [P2] api/playwright_runner.py:130-133 — 첨부 경로 검증이 실행 폴더 기준이나 보고서 신뢰에 의존 (CWE-22)
도구: 수동 코드 분석.
근거:
- Playwright JSON 보고서의 `attachment.path`를 `output.resolve()` 하위인지 검사한다. 하위 검사는 올바르다(양호).
- 다만 보고서 파일 자체를 생성 코드(P0)가 쓸 수 있다. `COMMON_TESTER_REPORT`는 `output/` 내부이지만 spec이 덮어쓸 수 있다.
- 현재 검증은 폴더 밖 경로를 `RuntimeError`로 거부하므로 직접 악용 경로는 확인하지 못했다. 보고서 위조로 통과 판정만 조작되는 무결성 문제로 낮춰 P2로 기록한다.
권장: 보고서는 러너 프로세스 외부에서 쓰이는 채널로 받는다.

### [P2] api/main.py:43,79,91 — 예외 메시지를 클라이언트에 그대로 반환 (CWE-209)
도구: 수동 코드 분석.
근거:
- `detail=str(error)`로 OSError, KeyError 메시지를 반환한다. 파일시스템 경로와 내부 구조가 노출될 수 있다.
- `api/workflow.py:253`의 OpenAI 오류 본문 일부(800자)와 `playwright_runner.py:101`, `codex_generator.py:209`의 `playwright.log` 일부가 502 응답과 보고서에 실린다.
- 로컬 도구라 영향은 낮다.
권장: 클라이언트에는 일반 메시지와 오류 ID만 주고 상세는 서버 로그에만 남긴다.

### [P2] api/codex_generator.py:206 — `shell=True`로 문자열 명령 실행 (CWE-78)
도구: 수동 코드 분석 (Grep `shell=True`).
근거:
- `command = f'"{ROOT / ...}\playwright.cmd" test --list ...'`를 `shell=True`로 실행한다.
- 보간되는 값은 `ROOT` 상수뿐이고 사용자 입력은 섞이지 않아 현재는 악용 경로가 없다(거짓 양성 가능성이 높아 P2).
- ROOT 경로에 `"`나 `&` 같은 문자가 있으면 깨지거나 주입될 수 있다.
- 같은 파일의 playwright_runner.py:95는 리스트 인자 방식(`node cli.js`)이라 일관성이 없다.
권장: `[node, cli.js, "test", "--list", ...]` 리스트 인자로 통일하고 `shell=True`를 제거한다.

### [P2] api/core.py:49-53 — DOCX XML 파싱에 `xml.etree` 사용 (CWE-776, CWE-409)
도구: 수동 코드 분석.
근거:
- `ET.fromstring(archive.read(info))`는 외부 엔티티는 해석하지 않으나 billion-laughs류 엔티티 확장 DoS에 취약할 수 있다.
- 완화로 `file_size > 10_000_000` 검사가 있으나 `info.file_size`는 zip 헤더 선언값이라 위조 가능하다. 실제 압축 해제 크기는 `archive.read` 전에 강제되지 않는다.
- 입력은 신뢰된 `documents/` 폴더 파일이라 영향은 낮다.
권장: `defusedxml` 사용 또는 `archive.open().read(limit+1)`로 실제 크기를 제한한다.

### [P2] api/requirements.txt:1-5 — 파이썬 의존성 미점검 및 해시 고정 부재 (CWE-1104, CWE-1357)
도구: pip-audit 부재. 취약점 유무는 미확인이다.
근거:
- 버전은 `==`로 고정되어 있으나 해시와 lock이 없다.
- 점검 불가 상태이므로 `pip-audit -r api/requirements.txt` 실행을 CI에 추가하길 권한다.

## 양호 확인 (거짓 양성 방지용 기록)

- `core.version_path`(core.py:28-34): 정규식 NAME과 `resolve().is_relative_to`로 product/version 경로 순회를 차단한다.
- run/execution ID는 32자리 hex로 제한된다(playwright_runner.py:19,29, codex_generator.py:17).
- `inspect-page.cjs:18-19`: script, style을 제거하고 input의 value 속성을 제거해서 수집 데이터에 자격 증명이 섞일 가능성을 줄였다.
- 대상 URL 검증은 userinfo, 제어문자, 백슬래시, 포트 0, `file:`과 `javascript:` 스킴을 거부한다(check_target_url.py 테스트가 존재).
- 프론트엔드: `dangerouslySetInnerHTML`, `innerHTML`, `localStorage` 사용이 없다. 링크 URL은 서버가 `quote`한 내부 경로다(results.py:36,59,60,86).
- 서버 측 `OPENAI_API_KEY`는 하위 프로세스 env에서 제거된다(codex_generator.py:26,201, playwright_runner.py:87, page_inspector.py:19).

## 크로스 도메인 태그

- [cross:design] P0 생성 코드 실행 신뢰 경계와 승인 게이트 설계.
- [cross:design] P1 SSRF의 대상 허용 정책(허용 목록 vs 차단 목록)은 제품 요구와 맞물린다. 로컬 데모 URL 지원과 충돌하므로 설계 결정이 필요하다.
- [cross:static] `api/main.py:105` `request.target_url if request else None` 등 입력 흐름은 정적 분석 리뷰어가 타입과 None 처리도 함께 확인해 달라.
