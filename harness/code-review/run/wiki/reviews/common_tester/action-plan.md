# 조치 계획

## 1단계: 즉시 (보안)

1. 생성 스펙 실행 격리 또는 실행 전 승인 단계 도입, 자식 프로세스 환경변수 허용 목록화 → [security.md §1](security.md)
2. 대상 URL의 사설 대역 차단 → [security.md §2](security.md)
3. API 토큰 요구와 `Origin` 검증 → [security.md §3, §4](security.md)
4. `FileResponse`에 `nosniff` 헤더 추가와 허용 확장자 제한 (한 줄 수준) → [security.md §5](security.md)

## 2단계: 정확성 버그 (작은 diff)

1. `index_status()` 하나로 임베딩 판정 통합
2. 커버리지 검사를 정확 일치로 변경 (`codex_generator.py:226`)
3. 대문자 검색어에서 ID 일치가 없으면 일반 검색으로 넘김 (`workflow.py:142`)
4. `App.tsx`의 오류 파싱과 진행 단계 종료 조건 수정
5. `shell=True` 제거하고 `playwright_runner`와 같은 실행 방식으로 통일

## 3단계: 구조 정리

1. `storage.py` 도입: 실행 폴더 경로, `save_json`, pipeline 상태 쓰기를 한곳으로
2. 제품별 섹션과 프롬프트 규칙을 `documents/<product>/` 설정으로 분리
3. `run_pipeline`, `run_summary` 삭제, GET 경로의 파일 쓰기 제거
4. README 링크 2곳 수정

## 기각하거나 보류한 지적 (정적 분석 에이전트)

| 지적 | 판단 |
| --- | --- |
| `gpt-5.4-mini` 모델명이 존재하지 않는다 (`workflow.py:228`) | **보류.** 에이전트의 모델 목록 지식이 오래된 것으로 보임. 실제 실행 기록으로 판단해야 하며, 기본값은 `.env`의 `OPENAI_MODEL`로 덮어쓸 수 있음 |
| UUID 충돌 시 `mkdir(exist_ok=False)`가 실패한다 | **기각.** 128비트 UUID라 충돌 확률은 사실상 0임. 오히려 `exist_ok=False`가 덮어쓰기를 막는 안전장치임 |
| `node.exe` 탐색, unmount 처리 | **기각.** 에이전트 스스로 "올바른 동작"이라고 평가한 항목임 |
