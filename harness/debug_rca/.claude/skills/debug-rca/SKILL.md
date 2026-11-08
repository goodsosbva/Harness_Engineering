---
name: debug-rca
description: 버그 보고서를 받아 재현 → 가설 → 수정-검증 → 포스트모템 순으로 디버깅과 원인 분석을 진행한다. "BUG-001 디버깅해 줘", "원인 분석해 줘" 요청에서 사용.
---

# 디버깅 / RCA 오케스트레이터

메인 세션이 오케스트레이터다. 직접 재현하거나 고치지 않는다.

## 1단계: 준비
- reports/{id}.md와 첨부를 읽어 _workspace/bug-{id}/report.md로 정리:
  증상, 기대 결과, 실제 결과, 발생 환경, 정상 환경, 첨부 목록
- _workspace/bug-{id}/observations/ 생성

## 2단계: 관찰 (팀 모드)
- reproducer와 log-analyzer를 한 팀으로 동시에 띄운다. 서로 직접 대화하게 둔다.
- 게이트 1: reproduction.sh가 3회 연속 같은 결과(버그 발생 + 대조군 정상)여야 통과.
  - 비결정적이면 멈추고 사용자에게 플래키 경로를 제안한다.
  - 재현 실패면 멈추고 보고자에게 물어볼 질문 목록을 만든다.
- 통과하면 팀을 해체한다.

## 3단계: 가설 (서브에이전트)
- hypothesis-analyst를 부른다.
- 1순위 가설의 반증 실험을 reproducer(서브에이전트)에게 실행시킨다.
  - 실험이 가설을 지지하면 4단계로.
  - 가설이 지워지면 2순위로 내려가 같은 방식으로 확인한다.

## 4단계: 수정-검증 (서브에이전트 루프, 최대 3회)
attempt = 1부터:
1. fixer를 부른다 (재시도면 이전 FAIL 사유 전달).
2. reproducer를 부른다: reproduction.sh 3회 연속 + npm test.
3. PASS → 5단계로.
4. FAIL → attempt + 1. 3회째 FAIL이면 git checkout으로 되돌리고 사람에게 넘긴다.
- 매 회차 결과를 _workspace/bug-{id}/verification.md에 누적 기록한다.

## 5단계: 정리
- postmortem.md: 증상, 타임라인, 직접 원인, 기여 요인, 수정 내용, 재발 방지 액션 (blameless)
- similar-patterns.md: 직접 원인과 같은 코드 패턴을 저장소 전체에서 Grep으로 찾아 목록화. 고치지는 않는다.
- completion-checklist.md:
  - [ ] 재현 3회 연속 확인
  - [ ] 1순위 가설 반증 실험 통과
  - [ ] 수정 후 재현 스크립트 3회 연속 통과
  - [ ] 회귀 테스트 추가
  - [ ] 유사 패턴 검색 완료
  - [ ] 재발 방지 액션 작성
- 사용자에게 한 단락 요약 보고. 커밋하지 않는다.
