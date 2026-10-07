> **⚠ HARNESS NOT APPLIED** — This document was produced without any harness (no CLAUDE.md, skills, hooks, or custom agent configuration applied).

# Claude Code 사용 팁

## 1. 맥락 관리: 가장 중요함

- **CLAUDE.md**: 프로젝트 루트에 두면 세션마다 자동으로 읽힘. `/init`으로 초안 생성 후 빌드·테스트 명령어, 코드 스타일, 금지 사항을 짧게 기록.
  - 위치: `~/.claude/CLAUDE.md`(개인 전역), `./CLAUDE.md`(팀 공유, git 커밋), `./CLAUDE.local.md`(개인용)
- **`/clear`**: 작업 주제가 바뀌면 대화 초기화. 지난 맥락이 남으면 품질 저하.
- **`/compact`**: 긴 작업 중 맥락을 요약·압축. 남길 내용을 지시로 덧붙일 수 있음.
- **`/context`**: 맥락 창 사용량 확인.
- **`@파일경로`**: 관련 파일을 직접 지정하면 탐색이 줄어 빠르고 정확해짐.

## 2. 작업 방식

- **계획 먼저 (Plan Mode)**: `Shift+Tab`으로 전환하면 코드 수정 없이 계획만 수립. 큰 변경은 "탐색 → 계획 → 구현 → 커밋" 순서가 안전.
- **검증 수단 제공**: "테스트를 먼저 짜고 통과할 때까지 수정"처럼 성공 기준을 주면 결과가 크게 향상. UI는 스크린샷 첨부.
- **구체적 지시**: "로그인 고쳐줘"보다 "세션 만료 후 `/login`으로 리다이렉트되지 않는 버그, `auth/middleware.ts` 확인"이 훨씬 나음.
- **중간 개입**: `Esc` 멈춤, `Esc` 두 번(또는 `/rewind`) 이전 시점으로 되돌리기. 방향이 틀리면 즉시 중단.
- **`!` 접두사**: `!git status`처럼 셸 명령을 바로 실행하고 결과를 맥락에 포함.

## 3. 권한과 안전

- **`/permissions`** 또는 `.claude/settings.json`에서 자주 쓰는 명령(예: `Bash(npm run test:*)`)을 허용하면 승인 요청 감소.
- `--dangerously-skip-permissions`는 컨테이너 등 격리 환경에서만 사용.
- 작업 전 git 커밋으로 언제든 되돌릴 수 있게 준비.

## 4. 확장 기능

- **커스텀 명령 / 스킬**: `.claude/commands/` 또는 `.claude/skills/`에 반복 프롬프트를 저장해 `/이름`으로 호출.
- **서브에이전트**: `.claude/agents/`에 정의. 코드 리뷰·탐색처럼 별도 맥락이 필요한 일에 적합.
- **Hooks**: 파일 수정 후 포매터 실행처럼 반드시 일어나야 하는 일은 프롬프트 대신 hook으로.
- **MCP**: `claude mcp add`로 DB, Jira, 브라우저 등 외부 도구 연결.

## 5. 생산성 명령어 (Git Bash)

```bash
claude -c                                  # 직전 대화 이어가기
claude -r                                  # 지난 세션 골라서 재개
claude -p "이 로그 요약해줘" < app.log       # 비대화형(헤드리스) 실행, 스크립트·CI용
git worktree add ../proj-feat feat-branch  # 워크트리로 여러 세션 병렬 작업
```

- `/model`로 모델 변경. 어려운 설계는 상위 모델, 단순 반복은 가벼운 모델.
- `/install-github-app` 실행 후 PR에서 `@claude` 호출 가능.

## 핵심 세 줄

1. CLAUDE.md는 짧고 정확하게 관리.
2. 계획을 먼저 세우고, 검증 기준을 함께 제공.
3. 주제가 바뀌면 `/clear`로 맥락 초기화.

> 명령어·단축키는 버전마다 다를 수 있으므로 사용 중인 버전에서 `/help`로 확인.
