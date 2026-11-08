# commit-and-pr 스킬

- 위치: `.claude/skills/commit-and-pr/`
- 작성일: 2026-11-08
- 호출: `/commit-and-pr`, 또는 "커밋하고 PR 올려줘", "commit and PR"

## 파일 구성

| 파일 | 역할 |
|---|---|
| `SKILL.md` | 두 스킬을 이어 붙이는 절차와 제약 |

템플릿은 따로 두지 않습니다. 커밋 규칙은 `git-commit`, PR 템플릿은 `create-pr/resources/pr_template.md`를 그대로 씁니다.

## 동작 순서

1. 상태 확인: 변경사항, 현재 브랜치
2. `main`이면 커밋 전에 새 브랜치 생성 (`<type>/<짧은-설명>`)
3. 커밋 범위 결정: 성격별로 묶어 보여주고 확인
4. `git-commit` 스킬로 커밋
5. `create-pr` 스킬로 push와 PR 생성. 이미 열린 PR이 있으면 push만 함
6. 결과 보고: 커밋 목록, PR URL, 남겨 둔 파일

## 스킬 관계

```
commit-and-pr
├── git-commit   (커밋 메시지 컨벤션)
└── create-pr    (push, PR 템플릿, 이슈 연결)
```

## 안전장치

- 승인은 두 번 받음: 커밋할 때와 PR을 만들 때
- `main`에 직접 커밋하거나 push하지 않음
- 커밋이 실패하면 PR 단계로 넘어가지 않음
- force push는 명시적으로 요청할 때만
