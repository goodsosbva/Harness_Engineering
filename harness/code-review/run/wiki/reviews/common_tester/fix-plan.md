# 수정 계획안

근거: [2차 통합 보고서](../../../../_workspace/review_report.md). 대상은 `D:/common_tester` (HEAD `8d840ed`).
원칙
- 브랜치 하나에서 작업함
- 단계마다 커밋 1개
- 단계마다 기존 `api/check_*.py`와 검증 스크립트 1개로 확인함

## 1단계: 생성 코드 실행 경로 방어 (P0, 반나절)

| 작업 | 파일 | 방법 |
| --- | --- | --- |
| P0 patch 적용 | `playwright_runner.py`, `codex_generator.py`, `check_spec_gate.py` | `git apply`. 적용 뒤 CRLF 줄바꿈을 확인함 |
| skip 계열 금지 | `playwright_runner.py` `SPEC_FORBIDDEN` | `test.skip`, `test.fixme`, `test.fail`, `test.only`를 추가함 (한 줄) |
| 화면 수집 env 정리 | `page_inspector.py:19` | `child_env()`를 재사용함 (한 줄) |
| 외부 호출 차단 | `main.py` | `TrustedHostMiddleware(127.0.0.1, localhost)`를 추가함. POST에 `Origin` 검사 미들웨어를 둠 (약 10줄) |
| 결과 파일 서빙 | `main.py:131` | 허용 확장자(png, json, log, ts, txt, zip)만 서빙함. `nosniff` 헤더와 `attachment` 처리를 붙임 |

검증
- `check_spec_gate.py`
- 브라우저 요청을 흉내 내어 `Origin: evil.example`과 `Host: attacker` 요청이 403으로 거부되는지 확인
- `.html` 파일 요청이 404인지 확인

## 2단계: 판정 정확성 버그 (P1, 반나절)

| 작업 | 파일 | 방법 |
| --- | --- | --- |
| **skipped가 passed로 집계됨** | `results.py:48-49` | `test_status != "passed"`이면 `passed`를 주지 않음. `skipped`는 `unconfirmed`로 처리함 |
| 임베딩 판정 통일 | `core.py`, `workflow.py:64` | `core.index_status(folder) -> (ok, reason)`를 만듦. 판정 조건은 파일 목록 전체 해시, chunking, model 세 가지. `list_products`와 `_requirements`가 이 함수를 같이 씀 |
| `failed` 의미 분리 | `App.tsx:130` | 드롭다운도 `item.summary`를 쓰게 함. 라벨을 "점검 실패"로 통일함 |
| 커버리지 오탐 | `codex_generator.py:226` | 목록 결과의 각 줄 토큰과 정확히 비교함 |
| 대문자 검색어 | `workflow.py:142` | ID로 찾은 결과가 없으면 일반 검색으로 넘김 |
| 오류 응답 파싱 | `App.tsx:20` | `response.json().catch(() => ({}))` |
| 없는 파일 링크 | `results.py:87` | 실제로 존재하는 파일만 artifacts에 넣음. `launch-error.txt`도 포함함 |

검증
- `check_verdict.py`(새 파일, assert 방식): skipped+TN → unconfirmed, failed → failed, passed+TP → passed
- 기존 `check_stage4~6.py`

## 3단계: SSRF 정책 (P1, 결정 필요)

로컬 데모(`127.0.0.1:8765`)와 공개 포트폴리오 화면을 모두 대상으로 쓰고 있어, 단순히 차단할 수 없음.

- **안 A (권장):** 링크로컬(`169.254.0.0/16`)과 메타데이터 주소는 항상 차단함. 사설망과 루프백은 `.env`의 `COMMON_TESTER_ALLOW_PRIVATE=1`일 때만 허용함. DNS를 해석한 뒤 검사하고, 브라우저 요청은 `page.route`로 리다이렉트까지 검사함
- 안 B: `.env`에 허용 호스트 목록을 두고 그 목록만 허용함

## 4단계: 구조 정리 (P2, 1일)

| 작업 | 내용 |
| --- | --- |
| `storage.py` | `ROOT`, `RUNS`, `run_folder`, `execution_folder`, `save_json`과 1단계에서 만든 helper를 모음. 5개 모듈은 이것만 import함 |
| 원자적 쓰기 통일 | run 폴더 JSON을 모두 `save_json`으로 씀 |
| 상태 기록 단일화 | `_finish_status` 하나로 모음. 상태 어휘는 상수 하나로 고정함 |
| GET 부작용 제거 | `summarize_results`의 계산과 저장을 분리함 |
| 사용하지 않는 코드 삭제 | `run_pipeline`, `run_summary`, `statusNames.unsupported`, `workflow.py:138`의 `""` 비교 |
| 제품 전용 상수 | `SECTIONS`를 문서의 `##` 제목에서 동적으로 수집함 |
| README | 틀린 링크 2곳 수정 |

검증: 1~3단계 검증을 다시 실행함. 대상 화면에 대해 전체 파이프라인을 한 번 돌림 (OpenAI와 Codex 실제 호출, 수동)

## 보류 (필요해지면 진행)

- 생성 코드 실행을 컨테이너나 저권한 계정으로 격리. P0의 근본 해결이나 Docker가 없는 환경이라는 전제와 충돌함
- 실행 전 사람 승인 UI
- 실행 계열 엔드포인트를 202 응답과 폴링 방식으로 통일하고, 서버에 run 단위 잠금을 둠
- `defusedxml` 적용, `pip-audit`와 `eslint` 도입
- scenario_key 공백 문제 (현재 문서 파일명에는 공백이 없음)
