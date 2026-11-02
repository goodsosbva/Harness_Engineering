# 보안 감사

수동 코드 리뷰와 git 명령으로 확인한 결과입니다. `npm audit`, `pip-audit`, semgrep은 실행하지 않았으므로 의존성 취약점은 확인하지 못했습니다.

## 1. [P0] LLM 생성 코드를 격리 없이 실행 (CWE-94)

- 위치: `api/playwright_runner.py:86-96`, `api/codex_generator.py:192-206`
- Codex가 만든 `*.spec.ts`를 API 서버 권한으로 그대로 `playwright test` 실행함
- 형식 검사는 파일 안에 `"playwright-observations"`와 `"test("` 문자열이 있는지만 확인함
- 자식 프로세스는 `os.environ.copy()`를 그대로 받음. 제거하는 값은 `OPENAI_API_KEY` 하나뿐임
- 공격 경로: 대상 웹페이지 HTML에 프롬프트 인젝션을 심음 → 그 HTML이 Codex 입력으로 들어감 → 생성된 스펙에 임의의 Node 코드가 섞임 → 호스트에서 실행됨
- 조치
  - 실행 환경을 컨테이너나 저권한 사용자로 격리
  - 환경변수를 허용 목록 방식으로 전달 (`PATH`, `SYSTEMROOT`, `COMMON_TESTER_*` 등)
  - 스펙 파일에서 `child_process`, `fs`, `require`, `process.env` 사용을 차단
  - 실행 전 사람이 승인하는 단계 추가

## 2. [P1] 대상 URL 기반 SSRF (CWE-918)

- 위치: `api/target_url.py:5-18`, `api/playwright_runner.py:80`, `scripts/inspect-page.cjs:7-13`
- URL 검증이 스킴과 호스트 존재 여부만 확인함. loopback, `169.254.169.254`, 사설 대역을 차단하지 않음
- 수집한 HTML이 결과물로 저장되어 사용자에게 다시 노출됨
- 조치
  - DNS 해석 뒤 사설, 루프백, 링크로컬 대역 차단
  - 브라우저 요청마다 `page.route`로 검증
  - 로컬 대상은 명시적 opt-in 플래그로만 허용

## 3. [P1] API 인증 없음 (CWE-306)

- 위치: `api/main.py` 전체 라우트
- 1번과 2번을 인증 없이 트리거할 수 있음
- README는 `127.0.0.1` 바인딩을 안내하지만 코드가 강제하지는 않음
- 조치: 토큰 헤더 요구, 루프백 바인딩 강제

## 4. [P2] 로컬 웹페이지를 경유한 CSRF (CWE-352)

- 위치: `api/main.py`, `POST /api/runs/{id}/execute`
- 본문 없는 POST를 받으므로, 악성 페이지가 `no-cors` 요청으로 재실행을 유발할 수 있음 (run_id를 알아야 함)
- 조치: `Origin` 헤더 검증

## 5. [P2] 결과 파일을 same-origin으로 서빙 (CWE-79)

- 위치: `api/main.py:131` `FileResponse(file)`
- `nosniff`, `Content-Disposition` 헤더가 없음. 1번과 결합하면 생성 스펙이 HTML 파일을 써서 저장형 XSS로 이어질 수 있음
- React 쪽은 `dangerouslySetInnerHTML`을 쓰지 않아 안전함
- 조치: 허용 확장자 제한(png, json, log, ts), `X-Content-Type-Options: nosniff` 추가

## 6. [P3] 기타

| 위치 | 문제 | CWE |
| --- | --- | --- |
| `codex_generator.py:205-206` | `shell=True`로 경로 문자열을 실행함. 현재는 사용자 입력이 섞이지 않음 | CWE-78 |
| `main.py` 전반 `detail=str(error)` | 내부 예외 메시지와 경로가 그대로 응답됨 | CWE-209 |
| `core.py:53` | docx 파싱에 `xml.etree` 사용. 입력이 신뢰된 파일이라 현재 위험은 낮음 | CWE-776 |

## 시크릿 점검

- `.env`는 git 이력에서 추적된 적이 없음. 추가된 env 계열 파일은 `.env.example` 3건뿐임
- `.gitignore`가 `.env`와 `.env.*`를 막고 `!.env.example`만 허용함
- `.local/`과 `*.sqlite3`도 추적되지 않음
