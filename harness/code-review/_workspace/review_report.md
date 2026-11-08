# Common Tester 코드 리뷰 통합 보고서 (2차)

- 대상: `D:/common_tester` (HEAD `8d840ed`). PR diff 없이 전체 코드를 리뷰함. 범위는 `_workspace/input/scope.md`의 25개 파일
- 팀: static-analyzer(haiku) / design-reviewer(opus) / security-auditor(sonnet) / refactorer(opus)
- 일자: 2026-11-01
- 소스 수정 0건, git commit 0건. patch 파일만 생성함

## 우선순위별 발견

| 등급 | 출처 | 위치 | 내용 |
| --- | --- | --- | --- |
| **P0** | security | `codex_generator.py:205`, `playwright_runner.py:95` | LLM이 생성한 spec을 격리 없이 실행함. `--list` 단계에서도 모듈 최상위 코드가 실행됨 → **patch 있음** |
| P1 | design ✅ | `results.py:48-49` ↔ `playwright_runner.py:113` | `skipped` 테스트가 `passed`로 판정됨 (거짓 통과) |
| P1 | design | `core.py:178` ↔ `workflow.py:64` | 임베딩 최신 여부를 두 곳에서 다르게 판정함 |
| P1 | design | `playwright_runner.py:167` ↔ `results.py:72` ↔ `App.tsx:130,133` | `failed`라는 이름이 두 의미로 쓰임. 한 화면에 "0 실패"와 "1개 점검 실패"가 함께 표시될 수 있음 |
| P1 | security | `main.py` 전체 | 인증, CSRF, Host 검증이 없음 |
| P1 | security | `target_url.py`, `inspect-page.cjs:12` | SSRF. 응답 내용이 요청자에게 되돌아옴 |
| P1 | security | `main.py:124-131` | 결과 파일을 같은 출처에서 서빙함. 저장형 XSS 가능 |
| P2 | design 11 / security 5 | — | 상세 목록은 [04_refactor.md](review/04_refactor.md)의 "다음 PR 권고"에 있음 |

✅ 오케스트레이터가 코드를 직접 다시 읽어 확인한 항목

## Patch

`patches/p0-generated-spec-isolation.diff` (`api/playwright_runner.py`, `api/codex_generator.py`, 새 파일 `api/check_spec_gate.py`)

1. 하위 프로세스 환경변수를 허용 목록 방식으로 전달함
2. 정적 게이트: import는 `@playwright/test`와 observations만 허용하고, `fs`, `child_process`, `eval`, `fetch` 등은 거부함. 게이트는 `--list` 전과 실행 전 두 곳에 둠
3. `shell=True`를 제거하고 `node cli.js` 호출 방식으로 통일함

**검증:** `git apply --check` 통과. 오케스트레이터가 다시 확인했고 exit 0이었음. 적용한 사본에서 악성 예시 10건은 모두 거부되었고, 기존 spec 7건은 오탐 0건이었음.

**한계:** 정규식 기반 게이트라 난독화하면 우회할 수 있음. `.env` 파일 읽기는 여전히 가능함. 근본 해결은 컨테이너 격리와 실행 전 사람의 승인임.

## 1차 리뷰 대비 변화

- 새로 찾음: `skipped → passed` 거짓 통과, `failed` 의미 혼용, 존재하지 않는 artifacts 링크, 원자적 쓰기 혼용, scenario_key 공백 문제, DOCX 압축 해제 크기 위조 가능성
- 도구 실행: `npm audit`은 0건(루트와 web), `tsc`와 `py_compile`은 통과. `pip-audit`, `semgrep`, `eslint`, `pyflakes`는 도구가 없어 실행하지 못함
- 1차에서 보류했던 "모델명이 존재하지 않는다" 지적은 이번에 나오지 않음. 리뷰어가 모델명 존재 여부를 판단하지 않도록 지시함

## 운영 메모

- 이 세션에는 커스텀 에이전트 타입이 로드되지 않아, 일반 에이전트에게 정의 파일(`.claude/agents/*.md`)을 그대로 읽혀 실행함. SendMessage를 통한 워커 간 교신은 하지 못했고, 대신 `[cross:*]` 태그로 표시함
- static-analyzer(haiku)는 정의상 Write가 금지되어 있으나 `01_static.md`를 직접 작성함. 내용은 보고와 같아 그대로 둠. 발견이 도구 출력 외에는 없어 기여도가 낮음 → 모델을 sonnet으로 올리기를 권함
- `gh pr comment` 단계는 PR이 없어 생략함
- refactorer의 patch는 리뷰어 3인의 재검증을 거치지 않음 (생성-검증 루프 중 리뷰어 단계 미수행)

## 산출물

```
_workspace/
├── input/scope.md
├── review/01_static.md  02_design.md  03_security.md  04_refactor.md
├── patches/p0-generated-spec-isolation.diff
└── review_report.md   ← 이 문서
```
