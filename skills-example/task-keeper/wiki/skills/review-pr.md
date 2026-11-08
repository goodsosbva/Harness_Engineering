# review-pr 스킬

- 위치: `.claude/skills/review-pr/`
- 작성일: 2026-11-08
- 호출: `/review-pr`, 또는 "PR 리뷰해줘", "#123 PR 검토"

## 파일 구성

| 파일 | 역할 |
|---|---|
| `SKILL.md` | 리뷰 절차와 제약 |
| `resources/review_checklist.md` | 관점별 체크리스트와 리뷰 출력 형식 |

## 동작 순서

1. 대상 PR 결정: 번호가 있으면 그 PR, 없으면 현재 브랜치의 PR
2. 메타데이터 수집 (`gh pr view --json`): 연결 이슈, CI, 커밋, 파일
3. diff 분석 (`gh pr diff`): 필요하면 호출부까지 읽음
4. 체크리스트 적용: 메타데이터, 코드 품질, 보안, 성능, 테스트
5. 지적 사항을 심각도로 분류: 🔴 Blocker / 🟡 Major / 🟢 Minor
6. 정해진 형식으로 리뷰를 작성해 보여줌
7. (선택) 승인을 받은 뒤 `gh pr review`로 GitHub에 게시

## 안전장치

- 읽기 전용: 요청하지 않으면 코드를 고치지 않음
- 승인 없이 GitHub에 게시하지 않음
- `gh pr checkout`은 작업 트리를 바꾸므로 동의를 받은 뒤에만 실행
- 자기 PR에는 approve나 request-changes를 할 수 없으므로 `--comment`만 사용
- 문제가 없으면 억지로 지적을 만들지 않음
