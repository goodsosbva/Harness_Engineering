---
name: create-pr
description: 깃헙 Pull Request를 생성합니다. 현재 브랜치의 커밋과 변경사항을 분석해 템플릿에 맞춘 PR을 올립니다. "PR 만들어줘", "풀 리퀘스트 올려줘", "PR 생성해줘" 등의 요청에 반응합니다.
---

# GitHub Pull Request Creator Skill

## Goal

현재 브랜치의 변경사항을 분석하여 템플릿에 맞는 GitHub Pull Request를 생성합니다.

## Instructions

1. **상태 확인**: 아래 명령으로 현재 상태를 파악합니다.
   - `git status`: 커밋되지 않은 변경이 있으면 사용자에게 알리고, 먼저 커밋할지 묻습니다 (`git-commit` 스킬 사용).
   - `git branch --show-current`: 현재 브랜치가 기본 브랜치(`main`)라면 PR을 만들 수 없으므로 새 브랜치를 만들지 사용자에게 묻습니다.
   - `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name`: base 브랜치를 확인합니다.

2. **변경사항 분석**: base 브랜치 대비 이 브랜치에 들어간 내용을 모두 읽습니다.
   - `git log <base>..HEAD --oneline`: 포함될 커밋 목록
   - `git diff <base>...HEAD --stat`, `git diff <base>...HEAD`: 실제 변경 내용
   - 최신 커밋 하나만 보지 말고, 브랜치의 **모든 커밋**을 기준으로 작성합니다.

3. **관련 이슈 찾기**: 브랜치 이름, 커밋 메시지, 사용자 요청에서 이슈 번호를 찾습니다.
   - 필요하면 `gh issue list --state open`으로 관련 이슈를 확인합니다.
   - 이 PR이 이슈를 해결하면 본문에 `Closes #<번호>`를 넣습니다.

4. **템플릿 참조**: `resources/pr_template.md`에서 제목 형식과 본문 템플릿을 읽습니다.

5. **PR 내용 작성**:
   - 제목은 커밋 컨벤션과 같은 `<type>(<scope>): <subject>` 형식으로, 한국어로 50자 이내로 씁니다.
   - 본문은 템플릿의 각 섹션을 채웁니다. 확실하지 않은 부분은 `TODO: 추가 정보 필요`로 표시합니다.

6. **사용자 승인**: 제목, base/head 브랜치, 본문을 사용자에게 먼저 보여주고 승인을 받습니다.

7. **원격 브랜치 push**: 브랜치가 원격에 없거나 뒤처져 있으면 `git push -u origin <브랜치>`로 올립니다.

8. **gh CLI로 PR 생성**: 본문은 임시 파일에 저장한 뒤 `--body-file`로 넘깁니다. 따옴표나 줄바꿈이 깨지지 않게 하기 위해서입니다.

```
gh pr create --base <base> --head <브랜치> --title "<제목>" --body-file <본문 파일>
```

9. **결과 보고**: 생성된 PR URL을 사용자에게 알려줍니다.

## Constraints

- PR 본문은 한국어로 작성합니다.
- `gh` CLI가 설치되어 있고 인증이 완료된 상태를 전제합니다.
- 기본 브랜치(`main`)에 직접 push하지 않습니다.
- `git push --force`는 사용자가 명시적으로 요청한 경우에만 사용합니다.
- 사용자 승인 없이 PR을 생성하지 않습니다.
