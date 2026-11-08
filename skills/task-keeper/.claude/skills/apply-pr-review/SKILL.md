---
name: apply-pr-review
description: 깃헙 Pull Request의 리뷰 코멘트를 확인하고 코드에 반영한 뒤, 각 코멘트에 처리 결과를 답글로 남깁니다. "PR 리뷰 반영해줘", "리뷰 피드백 적용", "#123 리뷰 코멘트 처리" 등의 요청에 반응합니다.
---

# GitHub PR Review Applier Skill

## Goal

PR에 달린 리뷰 코멘트를 모두 모아 분류하고, 코드에 반영하고, 각 코멘트에 처리 결과를 답합니다.

## Instructions

1. **대상 PR 결정**
   - 요청에 번호가 있으면 그 PR을 씁니다 (`#123`, `123`, PR URL).
   - 번호가 없으면 `gh pr view --json number`로 현재 브랜치의 PR을 찾습니다.
   - 현재 브랜치가 PR의 head 브랜치가 아니면, 사용자 동의를 받고 `gh pr checkout <번호>`로 전환합니다.
   - 커밋되지 않은 변경이 있으면 먼저 사용자에게 알리고 어떻게 할지 묻습니다.

2. **리뷰 코멘트 수집**: 세 종류를 모두 모읍니다.
   - 인라인 리뷰 스레드 (해결 여부 포함):

     ```
     gh api graphql -F owner='{owner}' -F repo='{repo}' -F n=<번호> -f query='
       query($owner:String!, $repo:String!, $n:Int!) {
         repository(owner:$owner, name:$repo) {
           pullRequest(number:$n) {
             reviewThreads(first:100) {
               nodes {
                 id isResolved isOutdated path line
                 comments(first:50) { nodes { databaseId author { login } body url } }
               }
             }
           }
         }
       }'
     ```

   - 리뷰 본문(Approve/Request changes/Comment와 함께 쓴 글): `gh pr view <번호> --json reviews`
   - 일반 PR 코멘트: `gh pr view <번호> --json comments`
   - 이미 해결된 스레드(`isResolved: true`)는 제외합니다.

3. **코멘트 분류**: 각 코멘트를 하나씩 읽고 다음 중 하나로 분류합니다. 리뷰 본문 하나에 지적이 여러 개 있으면 지적별로 나눕니다.
   - **반영**: 타당하고 이 PR 범위 안에 있음 → 코드 수정
   - **질문 답변**: 코드 변경 없이 설명이 필요함
   - **반영 안 함**: 근거가 틀렸거나, 범위 밖이거나, 트레이드오프상 유지가 낫다고 판단함 → 이유를 적음
   - **보류**: 판단에 사용자 결정이 필요함

   리뷰어 의견을 무조건 따르지 않습니다. 지적이 맞는지 코드를 직접 읽고 확인합니다.

4. **반영 계획 승인**: 분류 결과를 표로 보여주고 사용자 승인을 받습니다. 표에는 코멘트, 위치, 분류, 계획을 적습니다. 보류 항목은 이때 사용자에게 결정을 받습니다.

5. **코드 반영**
   - 승인된 항목만 수정합니다. 리뷰에서 요청하지 않은 리팩터링은 하지 않습니다.
   - 수정 후 테스트를 실행합니다 (예: `uv run pytest`). 실패하거나 실행할 수 없으면 숨기지 말고 답글과 보고에 적습니다.

6. **커밋과 push**
   - `git-commit` 스킬의 컨벤션으로 커밋합니다. 관련 있는 지적끼리 묶되, 성격이 다르면 커밋을 나눕니다.
   - `git push`로 PR 브랜치에 올립니다. `--force`는 사용자가 명시적으로 요청한 경우에만 씁니다.

7. **각 코멘트에 답글**: `resources/reply_templates.md` 형식으로 작성합니다. 반영한 항목에는 커밋 해시를 넣습니다. 본문은 임시 파일에 저장해 넘깁니다.
   - 인라인 스레드: `gh api repos/{owner}/{repo}/pulls/<번호>/comments/<databaseId>/replies -F body=@<파일>`
     (`databaseId`는 스레드의 첫 번째 코멘트 값)
   - 리뷰 본문과 일반 코멘트: 답글 기능이 없으므로 `gh pr comment <번호> --body-file <파일>` 하나에 항목별 처리 결과를 모아서 씁니다.

8. **스레드 해결 처리 (선택)**: 사용자가 원하면 반영한 스레드만 해결 처리합니다. 반영 안 함과 질문 답변 스레드는 리뷰어가 판단하도록 열어 둡니다.

   ```
   gh api graphql -f query='mutation($id:ID!){ resolveReviewThread(input:{threadId:$id}){ thread { isResolved } } }' -F id=<스레드 id>
   ```

9. **결과 보고**: 항목별 처리 결과, 커밋 목록, 테스트 결과, 남은 항목을 사용자에게 보여줍니다.

## Constraints

- 답글과 커밋 메시지는 한국어로 작성합니다.
- `gh` CLI가 설치되어 있고 인증이 완료된 상태를 전제합니다.
- 반영 계획 승인 없이 코드를 고치거나 답글을 달지 않습니다.
- 반영하지 않은 코멘트를 반영했다고 답하지 않습니다. 실행하지 않은 테스트를 통과했다고 쓰지 않습니다.
- 리뷰어가 연 스레드를 반영 없이 해결 처리하지 않습니다.
