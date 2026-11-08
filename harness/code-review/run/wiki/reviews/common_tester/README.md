# Common Tester 2.0.1 코드 리뷰

- 대상: `D:/common_tester` (HEAD `8d840ed`)
- 범위: `api/`, `web/src/`, `scripts/`, `playwright.config.ts`, `playwright-observations.ts` (약 2,500줄). `1.0.0/` 스냅샷은 제외함
- 방식: 리뷰 에이전트 3개(보안 감사, 설계 검토, 정적 분석)를 병렬로 실행함. 핵심 지적은 메인 세션이 코드를 직접 다시 읽어 교차 확인함
- 일자: 2026-11-01
- 코드 수정: 없음 (읽기 전용 리뷰)

## 한눈에 보기

| 등급 | 건수 | 대표 항목 |
| --- | --- | --- |
| P0 (즉시) | 1 | LLM이 생성한 테스트 코드를 격리 없이 호스트에서 실행 |
| P1 (높음) | 4 | SSRF, API 무인증, 임베딩 최신 판정 로직 불일치, 실행 폴더 저장 계층 부재 |
| P2 (중간) | 8 | CSRF, 결과 파일 서빙 헤더, 제품 전용 지식 하드코딩, GET 요청의 파일 쓰기 등 |
| P3 (낮음) | 8 | `shell=True`, 사용하지 않는 함수, README 링크 오류, UI 진행 상태 표시 등 |

상세 내용은 아래 문서에 있습니다.

| 문서 | 내용 |
| --- | --- |
| [security.md](security.md) | 보안 감사 결과 (CWE 번호 포함) |
| [design.md](design.md) | 설계, 경계면, 정확성 결과 |
| [action-plan.md](action-plan.md) | 우선순위별 조치 계획과 기각한 지적 |

## 잘 되어 있는 점

- 경로 순회 방어가 견고함: `run_id`는 정규식 fullmatch와 `is_relative_to`로 이중 검증하고, `product`/`version`도 같은 방식으로 검증함 (`playwright_runner.py:18-34`, `core.py:25-34`, `main.py:127-130`)
- `subprocess` 호출이 대부분 리스트 인자 방식임. `target_url`도 argv 한 항목으로만 전달됨
- `.env` 파일은 git 이력 전체에서 한 번도 추적된 적이 없음
- Codex 승인 요청을 모두 거부하고, 명세 외 파일 생성과 입력 파일 변조를 탐지함
- JSON 저장이 임시 파일에 쓴 뒤 replace하는 방식이라 원자적임
- `main.py`와 `App.tsx` 사이 API 필드 이름이 서로 일치함

## 2차 리뷰 (2026-11-01, code-review-team 절차)

통합 보고서: [`_workspace/review_report.md`](../../../../_workspace/review_report.md). 개별 보고서 4건과 P0 patch는 `_workspace/review/`, `_workspace/patches/` 아래에 있음.
