# 설계와 정확성

✅ 표시는 메인 세션이 코드를 직접 다시 읽어 확인한 항목입니다.

## P1

### 임베딩 최신 판정 로직이 두 곳에서 다르게 동작함 ✅

- 위치: `core.py:175-187` (`list_products`의 `indexed`), `workflow.py:64-72` (`_requirements`)
- core 쪽은 현재 파일 목록 전체를 비교하지만, 임베딩 모델이 바뀌었는지는 보지 않음
- workflow 쪽은 DB에 저장된 파일만 해시 비교하므로, 새로 추가한 문서를 감지하지 못함
- 증상: UI는 "임베딩됨"으로 보이는데 실행 단계에서 오류가 나거나, 새 문서가 빠진 채로 실행이 진행됨
- 조치: core에 `index_status(folder) -> (ok, reason)` 하나를 두고 두 곳 모두 그 함수를 호출

### 실행 폴더 저장 계층이 없음

- `.local/runs` 경로를 6곳 이상에서 각자 조립함 (`workflow.py:381,451,464,480`, `codex_generator.py:142`, `results.py:131`)
- `ROOT`가 4개 모듈에 각각 정의되어 있음
- 의존 방향이 엇갈림: results와 main이 경로 함수를 실행 모듈인 `playwright_runner`에서 가져오고, workflow는 `save_json`을 results에서 가져옴
- 조치: `storage.py` 하나에 `RUNS`, `run_folder`, `execution_folder`, `save_json`을 모음

## P2

| 항목 | 위치 | 내용 | 조치 |
| --- | --- | --- | --- |
| 제품 전용 지식 하드코딩 | `workflow.py:24` `SECTIONS`, `:90` PDF 정규식, `codex_generator.py:168` 프롬프트 | 쇼핑몰 제품 전용 규칙이 범용 파이프라인 코드에 들어 있음 | `documents/<product>/` 아래 설정 파일로 분리 |
| `pipeline.json`을 쓰는 함수가 3개 | `workflow.py:371, 381, 450` | 세 함수의 경로 계산 방식도 서로 다름 | `_finish_status` 하나로 통합 |
| GET 요청이 파일을 씀 ✅ | `main.py:99` → `summarize_results` | `report.json`이 없으면 조회 요청이 파일을 생성함 | 계산과 저장을 분리 |
| Playwright 실행 방식이 2가지 | `codex_generator.py:205` vs `playwright_runner.py:95` | `.cmd` + `shell=True` 방식과 `node cli.js` 방식이 섞여 있음 | 명령 생성 함수를 공유 |
| 커버리지 부분 문자열 비교 ✅ | `codex_generator.py:226` | `scenario_key not in listing` 비교라서 `…-1`이 `…-10`에 포함되어 오탐이 남 | 목록의 각 줄 토큰과 정확히 비교 |
| 대문자 검색어 오분류 ✅ | `workflow.py:142` | `CSS` 같은 검색어를 요구사항 ID로만 해석하여 빈 결과와 오류가 남 | ID로 찾은 결과가 없으면 일반 검색으로 넘김 |

## P3

| 항목 | 위치 | 내용 |
| --- | --- | --- |
| 사용하지 않는 함수 ✅ | `workflow.py:489` `run_pipeline`, `:494` `run_summary` | 호출하는 곳이 없음. 삭제 |
| 진행 단계 표시 ✅ | `App.tsx:129` | 완료 조건이 `'completed'`뿐이라 `not_run`이나 `execution_error`로 끝나도 마지막 단계가 계속 active로 남음 |
| 오류 응답 파싱 ✅ | `App.tsx:20` | `response.json()`을 무조건 호출함. 평문 500 응답이면 SyntaxError가 나서 실제 원인이 가려짐 |
| 의미 없는 비교 ✅ | `workflow.py:138` | `""` 비교는 바로 앞 136줄에서 이미 걸러짐 |
| README 링크 | README `core.py#L28`, `App.tsx#L104` | 실제 위치는 `paragraphs` L44, 렌더링 시작 L112. 나머지 링크는 정확함 |

## 총평

LangGraph 노드 5개 구성은 적절한 크기입니다. 실제로 비어 있는 것은 **저장소 경계**와 **제품별 설정 경계** 두 가지입니다. 이 둘을 세우면 P1의 판정 불일치 문제와 P2 항목 다수가 함께 정리됩니다.
