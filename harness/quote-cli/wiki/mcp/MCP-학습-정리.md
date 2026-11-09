# MCP 학습 정리: quote-cli로 배운 것

> 2026-11-08 · `quote-cli` 프로젝트에서 직접 만든 MCP 서버를 Claude Code에 연결하고, 장애를 고치고, 훅으로 감사 로그를 남기기까지의 기록

---

## 1. MCP란

**MCP(Model Context Protocol)** 는 AI 클라이언트(Claude Code 등)가 외부 프로그램(MCP 서버)의 기능을 표준 방식으로 쓰게 해 주는 프로토콜이다.

```
Claude Code (클라이언트)  ⇄  stdio(JSON-RPC)  ⇄  main.py (MCP 서버)  ⇄  quotes.json
```

서버가 클라이언트에 내놓는 것은 세 가지다.

| 종류 | 역할 | 누가 부르나 | 이 프로젝트의 예 |
|---|---|---|---|
| **Tool** | 동작을 실행 (읽기/쓰기) | 모델이 스스로 판단해 호출 | `get_random_quote`, `add_quote` |
| **Resource** | 읽기 전용 데이터를 URI로 제공 | 사용자가 `@서버:URI`로 첨부 | `quote://all` |
| **Prompt** | 재사용할 프롬프트 템플릿 | 사용자가 슬래시 명령으로 호출 | `quote_post(topic)` |

---

## 2. 서버 만들기 (`main.py`)

Python SDK의 `FastMCP`를 쓰면 데코레이터만으로 서버를 만든다.

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("quote")                 # ① 서버 객체

@mcp.tool()                             # ② 도구: docstring이 곧 도구 설명
def get_random_quote() -> str: ...

@mcp.tool()                             # ③ 쓰기 도구
def add_quote(text: str, author: str) -> str: ...

@mcp.resource("quote://all")            # ④ 리소스
def all_quotes() -> str: ...

@mcp.prompt()                           # ⑤ 프롬프트
def quote_post(topic: str) -> str: ...

if __name__ == "__main__":
    mcp.run()                           # ⑥ 기본 전송은 stdio
```

- 함수의 **타입 힌트 → 입력 스키마**, **docstring → 도구 설명**으로 자동 변환된다.
  예: `add_quote` → `{"text": string, "author": string}`, 설명 "새 명언을 명언 목록에 추가합니다."
- 모델에게 노출될 때 도구 이름은 `mcp__<서버명>__<도구명>` 형태가 된다 → `mcp__quote__add_quote`.

---

## 3. Claude Code에 연결하기

### `.mcp.json` (프로젝트 루트, 팀과 공유 가능)

```json
{
  "mcpServers": {
    "quote": {
      "type": "stdio",
      "command": "uv",
      "args": ["run", "main.py"],
      "env": {}
    }
  }
}
```

- `stdio` 방식: Claude Code가 이 명령으로 서버 프로세스를 직접 띄우고 표준입출력으로 통신한다.

### `.claude/settings.local.json` (개인 설정)

```json
{
  "enabledMcpjsonServers": ["quote"],
  "enableAllProjectMcpServers": true
}
```

- 프로젝트 `.mcp.json`의 서버는 보안상 **승인을 받아야** 켜진다. 이 설정이 그 승인이다.
- 연결 상태 확인과 재연결은 세션 안에서 `/mcp`로 한다.

### 사용법 정리

| 하고 싶은 일 | 방법 |
|---|---|
| 도구 사용 | 자연어로 요청 ("명언 하나 추가해") → 모델이 `add_quote` 호출 |
| 리소스 첨부 | `@quote:quote://all` |
| 프롬프트 실행 | `/mcp__quote__quote_post <주제>` |

---

## 4. 겪은 장애와 해결 (핵심 교훈)

### 장애 ① 서버가 연결되지 않음

| 증상 | 처음 짐작한 원인 | 진짜 원인 |
|---|---|---|
| `quote` 서버 접속 실패 | 데이터 파일 이름 불일치 (`question.json` ↔ 코드는 `quotes.json`) | **`mcp` 패키지 2.x에는 `FastMCP`가 없음** → import 단계에서 서버가 즉시 종료 |

**해결**
1. 데이터 파일 이름을 `quotes.json`으로 변경
2. `pyproject.toml`의 의존성을 `mcp>=2.3.0` → **`mcp[cli]>=1.2,<2`** 로 고정 후 재설치
3. `/mcp`로 재연결

**교훈**
- 서버 연결 실패는 클라이언트에서는 "끊김"으로만 보인다. **`uv run main.py`를 직접 실행해 보는 것**이 가장 빠른 진단이다.
- 증상 하나에 원인이 여러 개일 수 있다. 첫 번째 원인만 고치고 멈추지 말 것.
- SDK 메이저 버전이 바뀌면 API가 사라질 수 있으니 **버전 상한을 고정**한다.

### 장애 ② 서버가 꺼진 동안의 우회와 그 대가

서버가 죽어 있는 동안 명언 조회·추가를 **파일 직접 읽기/쓰기로 우회**했다. 결과는 같아 보였지만:

- MCP 도구를 거치지 않았으므로 **`add_quote`에 걸린 훅이 실행되지 않음** → 감사 로그 누락
- 교훈: **훅/감사는 "도구 호출"에 걸린다.** 같은 일을 다른 경로로 하면 통제가 우회된다.

### 장애 ③ 감사 로그가 생기지 않음

| 증상 | 원인 |
|---|---|
| `add_quote`를 호출해도 `.claude/mcp-audit.log`가 생기지 않음 | 훅 스크립트가 쓰는 **`jq`가 시스템에 없음** (exit 127) |

**해결**
1. `winget install --id jqlang.jq -e` (새 셸부터 PATH 적용)
2. 지금 세션에서도 바로 쓰이도록 `jq.exe`를 `~/bin`(Git Bash PATH에 포함)에 복사
3. `add_quote` 실제 호출 → 로그 한 줄 기록 확인

자세한 기록은 [jq 설치로 훅 복구](../hooks/jq-설치로-훅-복구.md) 참고.

---

## 5. 훅(Hooks)으로 MCP 도구 통제하기

`settings.local.json`의 `PreToolUse` 훅은 **도구 실행 직전**에 스크립트를 돌린다. `matcher`에 MCP 도구 이름을 그대로 쓸 수 있다.

```json
"hooks": {
  "PreToolUse": [
    { "matcher": "Bash",                  "hooks": [{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/block-dangerous.sh" }] },
    { "matcher": "mcp__quote__add_quote", "hooks": [{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/audit-mcp.sh" }] }
  ]
}
```

### 훅이 받는 입력 (stdin JSON)

```json
{ "tool_name": "mcp__quote__add_quote", "tool_input": { "text": "...", "author": "..." } }
```

### 두 가지 활용 패턴

| 훅 | 목적 | 방식 |
|---|---|---|
| `audit-mcp.sh` | **기록**: 쓰기 도구 호출 감사 | 시각·도구명·입력을 탭 구분으로 로그에 추가, `exit 0` (통과) |
| `block-dangerous.sh` | **차단**: `rm -rf` 방지 | 패턴이 맞으면 `permissionDecision: "deny"` JSON을 출력 |

실제 남은 로그:

```
2026-11-08 18:55:52	mcp__quote__add_quote	{"text":"배움에는 왕도가 없다.","author":"유클리드"}
```

### ⚠️ 가장 중요한 교훈: 훅은 조용히 실패한다

- `jq`가 없어서 두 훅 모두 오류로 끝났지만, **PreToolUse 훅이 실패하면 차단하지 않고 그냥 통과**된다.
- 그래서 `rm -rf` 차단 훅도 **보호하는 것처럼 보였지만 실제로는 아무것도 막지 못했다.**
- 대책: 훅을 만든 뒤에는 **반드시 직접 입력을 흘려 넣어 테스트**한다.

```bash
echo '{"tool_name":"t","tool_input":{"command":"rm -rf /x"}}' | bash .claude/hooks/block-dangerous.sh
# → deny JSON이 나와야 정상
```

---

## 6. 체크리스트

- [ ] 서버를 `uv run main.py`로 단독 실행해 import 오류가 없는지 확인
- [ ] SDK 버전 상한 고정 (`mcp[cli]>=1.2,<2`)
- [ ] `.mcp.json` + `enabledMcpjsonServers` 승인
- [ ] `/mcp`에서 연결 상태 확인
- [ ] 훅 스크립트의 외부 의존성(`jq` 등) 설치 확인
- [ ] 훅을 가짜 입력으로 직접 테스트
- [ ] 서버가 죽었을 때 파일 직접 수정으로 우회하지 않기 (감사·통제 우회됨)
