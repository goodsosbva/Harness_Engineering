# harness — 팀 단위 하네스 실습

『하네스 엔지니어링 with 클로드 코드』를 따라 빈 폴더부터 팀 하네스를 쌓고 실제로 돌려 본 기록입니다. 실습마다 폴더를 나눴고, 각 폴더의 `wiki/`에 정리 글을 둡니다.

| 폴더 | 팀 | 주 패턴 | 정리 글 | 실행 결과 |
| --- | --- | --- | --- | --- |
| [code-review](code-review) | 코드 리뷰 4인 팀 | 팬아웃 & 팬인 | [실습기](code-review/wiki/01_코드리뷰팀_실습기.md) | [`_workspace/`](code-review/_workspace), [`run/wiki/`](code-review/run/wiki/reviews/common_tester) |
| [fullstack_function](fullstack_function) | 풀스택 구현 8인 팀 | Phase별 조합 (계층·파이프라인·팬아웃·생성-검증) | [구조](fullstack_function/wiki/02_풀스택팀_구조설명.md) · [쌓기](fullstack_function/wiki/03_풀스택팀_하네스_직접쌓기.md) · [배운 점](fullstack_function/wiki/04_풀스택팀_배운점.md) · [verifier 수정본](fullstack_function/wiki/05_boundary-verifier_수정본.md) | — |
| [legacy_migration](legacy_migration) | 레거시 마이그레이션 팀 | 감독자 + 생성-검증 | [실습기](legacy_migration/wiki/레거시마이그레이션_실습기.md) · [쌓기 가이드](legacy_migration/wiki/06_레거시마이그레이션팀_하네스_쌓기.md) | [`fullstack_function/result/`](fullstack_function/result) ※ |
| [debug_rca](debug_rca) | 디버깅 근본 원인 분석 팀 | — | — | [`result/BUG-001/`](debug_rca/result/BUG-001) |
| [skills-example](skills-example/task-keeper) | 프로젝트 스킬 6종 (이슈 → 커밋 → PR → 리뷰 → 리뷰 반영) | 스킬 체이닝 | [실습기](skills-example/task-keeper/wiki/00_스킬_워크플로_실습기.md) | [task-keeper#1](https://github.com/goodsosbva/task-keeper/issues/1), [#2](https://github.com/goodsosbva/task-keeper/pull/2), [`wiki/`](skills-example/task-keeper/wiki) |

※ 마이그레이션 결과 문서는 실행 당시 지시에 따라 `fullstack_function/result/`에 정리되어 있습니다.

전체 대화 흐름과 핵심 교훈은 [notes/00_README_대화정리.md](notes/00_README_대화정리.md)에 있습니다.

`node_modules/`와 각 폴더 `.gitignore`가 제외하는 `_workspace/`는 올리지 않았습니다.
