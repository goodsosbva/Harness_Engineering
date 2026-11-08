# create-pr 스킬

- 위치: `.claude/skills/create-pr/`
- 작성일: 2026-11-08
- 호출: `/create-pr`, 또는 "PR 만들어줘", "풀 리퀘스트 올려줘"

## 파일 구성

| 파일 | 역할 |
|---|---|
| `SKILL.md` | 스킬 절차와 제약 |
| `resources/pr_template.md` | PR 제목 형식과 본문 템플릿 |

## 동작 순서

1. 상태 확인: 커밋 안 된 변경, 현재 브랜치, base 브랜치
2. base 대비 브랜치의 모든 커밋과 diff 분석
3. 관련 이슈를 찾아 `Closes #N` 연결
4. 템플릿으로 제목과 본문 작성 (제목은 커밋 컨벤션 형식)
5. 사용자 승인
6. 필요하면 `git push -u origin <브랜치>`
7. `gh pr create --body-file`로 생성하고 URL 보고

## 안전장치

- `main`에 직접 push하지 않음
- force push는 명시적으로 요청할 때만
- 승인 없이 PR을 생성하지 않음
