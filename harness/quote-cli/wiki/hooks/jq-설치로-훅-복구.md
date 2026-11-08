# jq 설치로 훅 복구 (2026-11-08)

## 증상
- `.claude/mcp-audit.log`가 생성되지 않음
- `block-dangerous.sh`(rm -rf 차단)도 동작하지 않았음

## 원인
두 훅 모두 `jq`로 stdin JSON을 파싱하는데, 시스템에 `jq`가 없어 `exit 127`로 실패.
PreToolUse 훅이 실패하면 차단 없이 통과되므로 증상이 잘 드러나지 않음.

## 조치
1. `winget install --id jqlang.jq -e` (PATH 등록됨, 새 셸부터 적용)
2. 현재 세션에서도 바로 쓰이도록 `jq.exe`를 `~/bin`(Git Bash PATH에 이미 포함)에 복사

## 검증
| 항목 | 결과 |
|---|---|
| `jq --version` | jq-1.8.2 |
| `block-dangerous.sh`에 `rm -rf /x` 입력 | deny JSON 출력 ✅ |
| `add_quote` 실제 호출 → `mcp-audit.log` | 한 줄 기록됨 ✅ |

테스트용으로 추가한 명언은 `quotes.json` 백업본으로 되돌려 원상 복구함. 감사 로그의 테스트 기록 1줄은 그대로 남겨 둠.
