# 수정 전/후 비교

[수정 계획안](fix-plan.md)을 실제 코드로 옮긴 결과입니다.
- **원본 `D:/common_tester`는 수정하지 않았음**
- 원본을 사본으로 떠서 단계별로 고친 뒤, 새로 clone한 저장소에 patch 5개를 차례로 적용하여 깨끗하게 들어가는지 확인함

| 단계 | patch 파일 | 변경 규모 |
| --- | --- | --- |
| P0 | `_workspace/patches/series/01-p0.diff` | 3개 파일 |
| 1단계 | `02-stage1.diff` | 5개 파일 |
| 2단계 | `03-stage2.diff` | 6개 파일 |
| 3단계 | `04-stage3.diff` | 5개 파일 |
| 4단계 | `05-stage4.diff` | 11개 파일 (그중 새 파일 `storage.py`) |
| 합계 | | 15개 파일, +284 / −136 |

---

## P0: 생성 코드 실행 방어

### 하위 프로세스 환경변수 (`playwright_runner.py`, `codex_generator.py` 3곳)

```python
# 전: 서버의 환경변수를 거의 전부 넘기고, OpenAI 키 하나만 뺌
env = os.environ.copy()
env.pop("OPENAI_API_KEY", None)
```
```python
# 후: 실행에 필요한 항목만 넘김 (허용 목록)
CHILD_ENV_KEYS = ("PATH", "PATHEXT", "SYSTEMROOT", ..., "PLAYWRIGHT_BROWSERS_PATH", "HTTP_PROXY", ...)

def child_env(**extra: str) -> dict:
    env = {key: os.environ[key] for key in CHILD_ENV_KEYS if key in os.environ}
    env.update(extra)
    return env

env = child_env(COMMON_TESTER_TEST_DIR=..., COMMON_TESTER_OUTPUT_DIR=..., ...)
```
**효과:** 생성 코드가 `process.env`로 볼 수 있는 값이 PATH 같은 실행 필수 항목과 `COMMON_TESTER_*`로 줄어듦

### 생성 spec 정적 게이트 (새로 추가)

```python
# 전: 형식 검사가 문자열 포함 여부뿐
if "playwright-observations" not in content or "test(" not in content:
    raise RuntimeError(...)
```
```python
# 후: 위 검사에 더해 import와 위험 API를 검사함. 생성 직후(--list 전)와 실행 직전 두 곳에서 호출
SPEC_IMPORTS = {"@playwright/test", "../../../../playwright-observations"}
SPEC_FORBIDDEN = re.compile(
    r"\b(?:require|eval|Function|constructor|globalThis|child_process|fs|fetch|Buffer)\b"
    r"|\btest\.(?:skip|fixme|fail|only)\b"          # ← 1단계에서 추가
    r"""|\bimport\s*\((?!\s*['"]@playwright/test['"]\s*\))|\\u|\bprocess\b(?!\.env\.COMMON_TESTER_TARGET_URL\b)"""
)
check_spec_source(path.name, content)
```

### `--list` 호출 (`codex_generator.py`)

```python
# 전: 문자열 명령을 shell=True로 실행. Windows의 .cmd 파일에 의존함
command = f'"{ROOT / "node_modules" / ".bin" / "playwright.cmd"}" test --list --reporter=line'
result = subprocess.run(command, ..., shell=True)
```
```python
# 후: 실제 실행 단계와 같은 node + cli.js 방식. 리스트 인자, 셸 없음
command = [node, str(ROOT / "node_modules" / "@playwright" / "test" / "cli.js"), "test", "--list", "--reporter=line", "--config", str(ROOT / "playwright.config.ts")]
result = subprocess.run(command, ...)
```

---

## 1단계: 외부 호출과 파일 서빙 차단 (`main.py`)

```python
# 전: 미들웨어 없음. 어떤 Host나 Origin에서 온 요청이든 처리함
app = FastAPI(title="Common Tester", version="2.0.1", lifespan=lifespan)
```
```python
# 후
LOCAL_HOSTS = ["127.0.0.1", "localhost"]
ARTIFACT_TYPES = {".png", ".json", ".log", ".ts", ".txt", ".zip"}
app.add_middleware(TrustedHostMiddleware, allowed_hosts=LOCAL_HOSTS)   # DNS 리바인딩 차단

@app.middleware("http")
async def same_origin_only(request: Request, call_next):              # 다른 사이트에서 보낸 POST 차단
    origin = request.headers.get("origin")
    if request.method != "GET" and origin and origin.split("://", 1)[-1].split(":")[0] not in LOCAL_HOSTS:
        return JSONResponse({"detail": "허용되지 않은 출처입니다."}, status_code=403)
    return await call_next(request)
```

```python
# 전: 실행 폴더 안의 파일이면 확장자와 상관없이 그대로 서빙함
if not file.is_relative_to(folder) or not file.is_file():
    raise ValueError("허용된 결과 파일이 아닙니다.")
return FileResponse(file)
```
```python
# 후: 허용 확장자만 서빙함. PNG 외에는 다운로드로 내려주고 MIME 추측을 막음
if not file.is_relative_to(folder) or not file.is_file() or file.suffix.lower() not in ARTIFACT_TYPES:
    raise ValueError("허용된 결과 파일이 아닙니다.")
inline = file.suffix.lower() == ".png"
return FileResponse(file, content_disposition_type="inline" if inline else "attachment", headers={"X-Content-Type-Options": "nosniff"})
```

`page_inspector.py`도 `os.environ.copy()`를 `child_env()`로 바꿈 (한 줄).

| 요청 | 전 | 후 |
| --- | --- | --- |
| `Host: attacker.example` | 200 | **400** |
| 다른 사이트에서 보낸 POST (`Origin: https://evil.example`) | 처리됨 | **403** |
| `.../files/x.html` | `text/html`로 서빙됨 | **404** |

---

## 2단계: 판정 정확성

### skipped가 passed로 집계되던 문제 (`results.py`)

```python
# 전
quadrant = classify(case["expected_policy"], actual, infrastructure)
```
```python
# 후
# 실행되지 않은(skipped) 테스트의 관찰값으로 정책을 판정하지 않는다.
quadrant = None if case["status"] == "skipped" else classify(case["expected_policy"], actual, infrastructure)
```

같은 입력(거부 기대, 관찰값 deny)으로 `check_verdict.py`를 실행한 결과:

| 테스트 상태 | 전 | 후 |
| --- | --- | --- |
| passed | passed / TN | passed / TN |
| **skipped** | **passed / TN** ❌ | **unconfirmed / 없음** ✅ |
| failed | failed / TN | failed / TN |

원본 코드에서는 이 검증 스크립트가 `AssertionError: {'2': ('passed', 'TN')}`로 실패함을 확인함. 버그가 실제로 재현됨.

### 임베딩 최신 판정 통일 (`core.py`, `workflow.py`)

```python
# 전 (workflow._requirements): DB에 저장된 파일만 다시 해시함 → 새로 추가한 문서를 감지하지 못함
current_hashes = {relative: sha256(...) for relative in stored_hashes}
# 전 (core.list_products): 모델 변경을 확인하지 않음
"indexed": count > 0 and current_hashes == stored_hashes and metadata.get("chunking") == CHUNKING_VERSION,
```
```python
# 후: core에 판정 함수 하나를 두고 두 곳이 같이 씀
def index_status(path: Path) -> tuple[bool, str]:
    ...  # DB 존재, chunking·model 일치, 현재 폴더의 '전체' 파일 해시 == 저장된 해시
    return True, ""

"indexed": index_status(path)[0],                 # list_products
ready, reason = core.index_status(folder)         # _requirements
if not ready:
    raise ValueError(reason)
```

### 기타

| 위치 | 전 | 후 | 효과 |
| --- | --- | --- | --- |
| `codex_generator.py:231` | `item["scenario_key"] not in listing` | `re.search(rf"› {re.escape(key)}(?: \|$)", listing, re.M)` | `…-ALLOW-1`이 `…-ALLOW-10` 줄에 걸리지 않음 |
| `workflow.py:130` | `elif re.fullmatch(r"[A-Z][A-Z0-9_]+", scope):` | `... and any(item["requirement_id"] == scope for item in records):` | `CSS` 같은 검색어가 일반 검색으로 넘어감 |
| `workflow.py:128` | `{"", "전체", "all", "ALL"}` | `{"전체", "all", "ALL"}` | 앞에서 이미 걸러지는 `""` 비교 제거 |
| `results.py:88` | 4개 파일을 무조건 링크함 | 실제로 있는 파일만 링크함. `launch-error.txt` 포함 | 404 링크가 사라짐 |
| `App.tsx:20` | `await response.json()` | `await response.json().catch(() => ({}))` | 평문 500 응답에서도 오류 메시지가 표시됨 |
| `App.tsx:130` | `{counts.passed} 통과, {counts.failed} 실패` | `summary`가 있으면 `{test_passed} 통과, {failed} 점검 실패` | 드롭다운과 요약 영역의 숫자가 일치함 |

---

## 3단계: SSRF (안 A, `target_url.py`)

```python
# 전: 문법만 검사하고 호스트는 확인하지 않음. 169.254.169.254, 127.0.0.1이 모두 통과함
"""Validate target URL syntax without connecting to the target."""
```
```python
# 후: 접속 직전에 DNS를 해석해서 검사함
def check_target_host(value: str) -> str:
    """링크로컬(클라우드 메타데이터 포함)은 항상, 사설망과 루프백은 COMMON_TESTER_ALLOW_PRIVATE=1일 때만 허용한다."""
    addresses = {info[4][0].split("%")[0] for info in socket.getaddrinfo(host, None)}
    allow_private = os.getenv("COMMON_TESTER_ALLOW_PRIVATE") == "1"
    for address in map(ipaddress.ip_address, addresses):
        if address.is_link_local or address.is_multicast or address.is_unspecified or address.is_reserved:
            raise ValueError(...)
        if (address.is_private or address.is_loopback) and not allow_private:
            raise ValueError("내부 주소입니다. 로컬 앱을 검사하려면 .env에 COMMON_TESTER_ALLOW_PRIVATE=1을 설정하십시오: ...")
    return value
```
**호출 위치:** 화면 수집 시작 전, 리다이렉트 후의 최종 URL, Playwright 실행 직전 `urlopen` 앞. 또 `.env` 로더가 `COMMON_TESTER_ALLOW_PRIVATE`도 읽도록 바꿈.

| 대상 | 전 | 후 (기본값) | 후 (`ALLOW_PRIVATE=1`) |
| --- | --- | --- | --- |
| `169.254.169.254` | 통과 | 차단 | **차단** |
| `127.0.0.1:8765`, `192.168.x.x` | 통과 | 차단 | 통과 |
| 공개 주소 | 통과 | 통과 | 통과 |

⚠️ **동작 변경:** 지금처럼 로컬 데모(`127.0.0.1:8765`)를 검사하려면 `.env`에 `COMMON_TESTER_ALLOW_PRIVATE=1`을 추가해야 함. README에도 반영이 필요함.

---

## 4단계: 구조 정리

### 새 파일 `api/storage.py`

```python
ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / ".local" / "runs"
RUN_ID = re.compile(r"[a-f0-9]{32}")

def save_json(path, value): ...                       # results.py에서 옮김 (임시 파일에 쓴 뒤 교체)
def run_folder(run_id): ...                            # playwright_runner.py에서 옮김
def execution_folder(run_id, execution_id): ...        # playwright_runner.py에서 옮김
```

| 항목 | 전 | 후 |
| --- | --- | --- |
| `ROOT` 정의 | 5개 모듈에서 각자 정의 | `storage`에만 있음 |
| `.local/runs` 경로 조립 | 7곳에서 직접 조립 | `RUNS` 또는 `run_folder()` |
| ID 정규식 | 3곳 (`codex_generator`에서 따로 정의) | `storage.RUN_ID` |
| 경로 함수 위치 | 실행 모듈 `playwright_runner` (results와 main이 이 모듈에 의존함) | `storage` |
| run 폴더 JSON 쓰기 | `write_text` 5곳과 `save_json` 혼용 | 전부 `save_json` (원자적 쓰기) |

### 상태 기록 단일화 (`workflow.py`)

```python
# 전: pipeline.json을 쓰는 코드가 3벌. 경로 계산 방식도 서로 다름
def _progress(state, node):
    file = run_folder(state["run_id"]) / "pipeline.json"
    previous = json.loads(...) if file.is_file() else {...}
    save_json(file, {**previous, "status": "running", "current_node": node, "error": None})

def summarize_results(state):
    ...
    file = ROOT / ".local" / "runs" / state["run_id"] / "pipeline.json"
    previous = json.loads(file.read_text(encoding="utf-8"))
    save_json(file, {**previous, "status": report["status"], ...})
```
```python
# 후: 모두 _finish_status 하나를 거침
def _progress(state, node):
    _finish_status(state["run_id"], "running", current_node=node, error=None)

def summarize_results(state):
    ...
    _finish_status(state["run_id"], report["status"], current_node="summarize_results", latest_execution_id=execution_id)
```

### GET 요청의 부작용 제거 (`results.py`)

```python
# 전: publish=False(조회)여도 report.json을 씀
save_json(output / "report.json", report)
if publish:
    ...
```
```python
# 후: publish일 때만 씀. GET /report는 계산만 함
if publish:
    save_json(output / "report.json", report)
    ...
```

### 삭제

- `workflow.run_pipeline`, `workflow.run_summary`: 호출하는 곳이 없음
- `App.tsx` `statusNames.unsupported`: 도달할 수 없는 키
- `main.py`의 `from playwright_runner import execution_folder` → `from storage import execution_folder`

---

## 검증 결과

| 검증 | 결과 |
| --- | --- |
| clone한 저장소에 `git am`으로 patch 5개 연속 적용 | 통과 |
| `check_target_url.py` (기존) | PASS |
| `check_spec_gate.py` (P0 새 파일) | 통과. 악성 예시 10건 거부, 기존 spec 7건 오탐 0건 |
| `check_http_guard.py` (1단계 새 파일) | 통과 |
| `check_verdict.py` (2단계 새 파일) | 통과. 원본 코드에서는 실패함 (버그 재현) |
| `check_target_host.py` (3단계 새 파일) | 통과 |
| `tsc --noEmit` (web) | 오류 0건 |
| `check_stage4~6.py`, `check_foundation.py` 등 | **실행하지 못함.** `documents/`와 임베딩 모델 캐시(git 미추적)가 필요함. 실제 저장소에 적용한 뒤 실행해야 함 |

## 적용 전에 아셔야 할 점

1. `check_target_url.py`를 한 줄 수정함 (`TestClient(..., base_url="http://127.0.0.1")`). 1단계의 Host 검증이 TestClient 기본 호스트(`testserver`)를 거부하기 때문
2. Codex App Server에 넘기는 환경변수가 허용 목록으로 줄어듦. Codex 로그인이 `USERPROFILE\.codex`에 있으면 동작하지만, **실제 코드 생성을 한 번 돌려 확인해야 함**
3. 3단계 이후 로컬 데모를 검사하려면 `.env`에 `COMMON_TESTER_ALLOW_PRIVATE=1`이 필요함
4. 저장소 작업본은 CRLF, patch는 LF임. `git am`이나 `git apply`로 적용하면 git 설정(`core.autocrlf=input`)대로 처리됨
5. 이번에 빠진 항목: `SECTIONS`를 문서에서 동적으로 수집하기, README 링크 수정. 둘 다 동작에는 영향이 없음
