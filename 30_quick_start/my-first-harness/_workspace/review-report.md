## 판정
REDO

## 사유
- `git diff --cached` 상 스테이지된 변경은 `.claude/agents/commit-msg-author.md`, `.claude/agents/commit-msg-reviewer_WORONG.md`, `.claude/skills/commit-message/SKILL.md`, `CLAUDE.md`, `README.md`, `_workspace/commit-draft.md`, `_workspace/review-report.md` 총 7개 파일 추가로, 핵심은 author/reviewer 에이전트와 commit-message 스킬 신규 scaffold임.
- 그런데 `_workspace/commit-draft.md`의 현재 제목은 `docs(readme): add project README`이며 본문도 README.md 단일 파일만 설명 — 스테이지된 전체 diff 중 극히 일부(1/7 파일)만 반영하고 있어 diff와 사실 불일치.
- 기대 제목(`feat: scaffold commit-message harness with author/reviewer agents`)은 `type(scope): subject` 형식과 전체 diff 범위에 부합하나, 현재 draft는 이와 다른 내용이므로 재작성 필요.

## 수정 지시
- type을 `docs` → `feat`으로 변경 (신규 기능/구조 추가이므로).
- scope를 `readme`에서 전체 변경을 포괄하는 scope(예: 생략 또는 `harness`)로 변경.
- 제목을 `feat: scaffold commit-message harness with author/reviewer agents`로 수정.
- 본문 3줄 이내로, 다음 내용을 포함해 재작성:
  - commit-msg-author / commit-msg-reviewer 에이전트와 이를 연결하는 commit-message 스킬 추가.
  - 프로젝트 문서(CLAUDE.md, README.md)와 `_workspace/` 산출물 포함.
- README.md 단독 변경만 언급하는 현재 본문 문장("Add README.md with the project title and the text...", "No prior commits exist...")은 삭제.
