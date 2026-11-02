---
name: feature-team
description: 풀스택 기능 구현 팀을 가동하는 진입점. "로그인 기능 만들어 줘", "○○ 기능 구현해 줘" 같은 기능 단위 요청에서 사용.
---

# 풀스택 기능 구현 팀 오케스트레이터

메인 세션이 PM 역할을 맡는다. 상세 절차와 판정 기준은 .claude/agents/feature-pm.md를 먼저 읽고 그대로 따른다.

## 팀 편성표
| Phase | 활성 담당자 | 패턴 | 다음으로 넘어가는 조건 |
|---|---|---|---|
| 0 | PM | - | 00_requirements.json 작성 완료 |
| 1 | api-designer, ui-designer, db-migrator | 팬아웃 & 팬인 | 설계 문서 3종 PM 검토 통과 |
| 2 | backend-impl, frontend-impl, boundary-verifier | 생성-검증 | 모든 경계면 PASS 또는 manual_queue 기록 |
| 3 | Phase 2와 동일 (새 팀 없음) | 생성-검증 | 남은 FIX / REDO 0건 |
| 4 | test-suite (단독 서브에이전트) | - | E2E 결과로 passes 갱신, 통합 보고서 작성 |

## 규칙
- Phase는 순서대로만 진행한다 (파이프라인). 앞 Phase 산출물 없이 다음 Phase를 시작하지 않는다.
- Phase가 바뀌면 이전 팀을 해체하고 새 팀을 만든다. 동시 활성 PM 포함 최대 4명.
- 산출물 경로는 _workspace/features/{기능명}/
- 사람 호출 조건: 검토 3회 초과, REDO 2회, 마이그레이션 실패, E2E 실패.
- 각 Phase가 끝날 때마다 사용자에게 한 줄로 진행 상황을 알린다.
