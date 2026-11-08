---
name: legacy-migration
description: 레거시 코드 대규모 마이그레이션을 감독자 패턴으로 진행한다. "마이그레이션해 줘", "TypeScript로 바꿔 줘" 요청에서 사용.
---

# 레거시 마이그레이션 감독자

메인 세션이 감독자다. 직접 변환하지 않는다. 대기열을 관리하고 일을 나눠 주고 판정을 받는다.

## 상태 파일
- _workspace/migration/batches.json — 진행 상태의 유일한 기준. 상태가 바뀔 때마다 즉시 저장한다.
- _workspace/migration/manual-queue.md — 사람이 봐야 할 파일과 사유
- 배치 status: pending → in_progress → converted → verified | failed

## 1단계: 의존 매핑
- dependency-mapper에게 target_glob "src/**/*.jsx"를 넘긴다.
- 돌려받은 batches.json 초안을 저장한다. max_attempts가 비어 있으면 3.
- 파싱 실패 파일은 manual-queue.md에 기록한다.
- cyclic 경고가 붙은 배치를 사용자에게 알린다.

## 2단계: 기준선 테스트
- baseline-tester를 부른다.
- npm test가 레거시 코드에서 전부 통과해야 3단계로 간다. 하나라도 실패하면 멈춘다.

## 3단계: 점진 변환 (감독자 루프)
반복한다, pending 배치가 없어질 때까지:
1. 시작 가능 배치 = status가 pending이고 depends_on의 모든 배치가 verified인 것
2. 비어 있는 워커 자리(최대 3)만큼 시작 가능 배치를 꺼낸다. complexity가 높은 것부터.
3. 꺼낸 배치를 in_progress로 바꾸고 저장한 뒤 migration-worker에게 하나씩 넘긴다.
4. 워커가 돌아오면 converted로 바꾸고 4단계 검증으로 보낸다.
5. 워커 자리가 비면 바로 1로 돌아가 다음 배치를 꺼낸다. 다른 워커를 기다리지 않는다.

## 4단계: 배치별 검증 (생성-검증 루프)
- migration-verifier에게 배치를 넘긴다.
- PASS → verified로 저장. 이 배치를 기다리던 배치들이 시작 가능해진다.
- FAIL → attempts + 1
  - attempts < max_attempts: 실패 사유를 붙여 pending으로 되돌린다 (다시 대기열로)
  - attempts = max_attempts: 그 배치 파일을 git checkout으로 되돌리고 failed로 저장, manual-queue.md에 기록.
    이 배치에 의존하는 배치들도 failed로 막고 사유를 남긴다.

## 끝
- verified / failed / manual-queue 건수를 사용자에게 보고한다.
- 커밋은 하지 않는다.
