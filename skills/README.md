# skills — 프로젝트 스킬 실습

반복되는 개발 절차를 Claude Code 프로젝트 스킬로 고정하고, 실제 저장소에서 돌려 본 기록입니다. 실습마다 폴더를 나눴고, 각 폴더의 `wiki/`에 정리 글을 둡니다.

| 폴더 | 다루는 흐름 | 스킬 | 정리 글 | 실행 결과 |
| --- | --- | --- | --- | --- |
| [task-keeper](task-keeper) | 이슈 → 커밋 → PR → 리뷰 → 리뷰 반영 | `create-issue`, `git-commit`, `create-pr`, `review-pr`, `apply-pr-review`, `commit-and-pr` | [실습기](task-keeper/wiki/00_스킬_워크플로_실습기.md) | [이슈 #1](https://github.com/goodsosbva/task-keeper/issues/1), [PR #2](https://github.com/goodsosbva/task-keeper/pull/2), [`wiki/`](task-keeper/wiki) |

`.venv/`, `*.db`, `__pycache__/`처럼 `task-keeper/.gitignore`가 제외하는 파일은 올리지 않았습니다.
