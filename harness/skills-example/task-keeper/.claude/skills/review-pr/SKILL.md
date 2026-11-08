---
name: review-pr
description: 깃헙 Pull Request를 리뷰합니다. PR의 diff와 메타데이터를 분석해 체크리스트 기반으로 코드 품질, 보안, 성능, 테스트 관점의 리뷰를 작성합니다. "PR 리뷰해줘", "#123 PR 검토", "풀 리퀘스트 봐줘" 등의 요청에 반응합니다.
---

# GitHub Pull Request Review Skill

## Goal

PR의 diff와 메타데이터를 분석하여, 체크리스트에 따라 코드 품질·보안·성능·테스트 관점의 리뷰를 작성합니다.

## Instructions

1. **대상 PR 결정**
   - 요청에 번호가 있으면 그 PR을 씁니다 (`#123`, `123`, PR URL).
   - 번호가 없으면 `gh pr view --json number`로 현재 브랜치의 PR을 찾습니다. 그래도 없으면 `gh pr list`를 보여주고 사용자에게 묻습니다.

2. **메타데이터 수집**

   ```
   gh pr view <번호> --json number,title,body,author,baseRefName,headRefName,state,isDraft,labels,closingIssuesReferences,commits,files,additions,deletions,reviewDecision,statusCheckRollup
   ```

   - 연결된 이슈가 있으면 `gh issue view <번호>`로 이슈 내용을 읽고, PR이 이슈를 실제로 해결하는지 확인합니다.
   - `statusCheckRollup`으로 CI 결과를 확인합니다.

3. **diff 분석**
   - `gh pr diff <번호>`로 전체 diff를 읽습니다.
   - diff만으로 판단이 어려우면 변경된 함수의 호출부와 주변 코드를 저장소에서 직접 읽습니다. 예를 들어 바뀐 함수를 다른 곳에서 어떻게 쓰는지 grep합니다.
   - PR 브랜치가 로컬에 없으면 `gh pr checkout <번호>`는 사용자 동의를 받은 뒤에만 합니다. 작업 트리가 바뀌기 때문입니다.

4. **체크리스트 적용**: `resources/review_checklist.md`의 네 관점(코드 품질, 보안, 성능, 테스트)을 하나씩 점검합니다.
   - 해당 없는 항목은 건너뜁니다. 모든 항목을 기계적으로 나열하지 않습니다.
   - 지적마다 **파일:라인**, **문제**, **근거**, **제안**을 씁니다.
   - 추측과 확인한 사실을 구분합니다. 확인하지 못한 것은 "확인 필요"로 표시합니다.

5. **심각도 분류**
   - 🔴 **Blocker**: 머지 전에 반드시 고쳐야 함 (버그, 보안 취약점, 데이터 손실)
   - 🟡 **Major**: 고치는 것을 강하게 권장 (성능 문제, 테스트 누락, 잘못된 설계)
   - 🟢 **Minor**: 선택 사항 (가독성, 네이밍, 스타일)

6. **리뷰 작성**: `resources/review_checklist.md` 하단의 출력 형식으로 작성하여 사용자에게 보여줍니다.

7. **GitHub 게시 (선택)**: 사용자가 원하면 리뷰를 PR에 올립니다. 본문은 임시 파일에 저장해 `--body-file`로 넘깁니다.
   - 일반 코멘트: `gh pr review <번호> --comment --body-file <파일>`
   - 변경 요청: `gh pr review <번호> --request-changes --body-file <파일>`
   - 승인: `gh pr review <번호> --approve --body-file <파일>`
   - 자기 자신의 PR은 approve나 request-changes를 할 수 없으므로 `--comment`를 씁니다.

## Constraints

- 리뷰는 한국어로 작성합니다.
- `gh` CLI가 설치되어 있고 인증이 완료된 상태를 전제합니다.
- 리뷰는 읽기 전용 작업입니다. 사용자가 요청하지 않으면 코드를 수정하거나 커밋하지 않습니다.
- 사용자 승인 없이 GitHub에 리뷰나 코멘트를 게시하지 않습니다.
- 문제가 없으면 억지로 지적을 만들지 않고 "특이사항 없음"이라고 씁니다.
