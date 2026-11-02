# 02. 진행 과정

## 0단계: 인프라 준비 (하네스 전제 조건 보완)

| 문제 | 조치 | 비고 |
|---|---|---|
| git 저장소 아님 | `git init` 후 `git add -A`로 **인덱스에만** 스테이징 | 커밋은 하지 않음 |
| diff/롤백 기준 없음 | `git write-tree`로 기준 트리를 만듦: `7311b349cd23bb769eb7b1db0d7756cf89b5682f` | 커밋 객체가 아닌 트리 객체임. `_workspace/migration/base-tree.txt`에 저장 |
| package.json 없음 | `package.json`을 만듦 (`test: vitest run`, `typecheck: tsc --noEmit`) | devDeps는 vitest 2.1.9, typescript 5.9.3 |
| tsconfig 없음 | `tsconfig.json`을 만듦 (strict, Bundler 해석, `src/**/*.ts(x)`) | |

- 롤백 방법: `git checkout 7311b34 -- <파일>` (이번에는 쓸 일이 없었음).

## 1단계: 의존 매핑 (dependency-mapper)
- 대상 glob은 `src/**/*.jsx`.
- 결과로 배치 7개가 나옴. 이 내용은 `_workspace/migration/batches.json`에 저장함.
- `src/truncated.jsx`는 파싱 실패로 manual-queue에 들어감. `foo(` 호출이 닫히지 않은 채 잘렸고, 존재하지 않는 `./bar`를 import함.
- ⚠️ 순환 경고: **B6** (`cyclic-a` ↔ `cyclic-b`). 서로를 import하고 무한 재귀함.

## 2단계: 기준선 테스트 (baseline-tester)
- `tests/baseline/`에 4개 파일, 25개 테스트를 둠.

  | 파일 | 테스트 수 | 대상 |
  |---|---|---|
  | utils.test.js | 14 | http, api, useFetch, format, standalone, Footer |
  | hooks-context.test.js | 2 | useAuth, SessionContext |
  | components-pages.test.js | 7 | Header, UserCard, UserList, Profile, Dashboard, Settings |
  | cyclic.test.js | 2 | fromA, fromB → `RangeError` 박제 |

- fetch는 `vi.stubGlobal`로 막음. Date는 `2024-05-06T12:00Z`로 고정함.
- 레거시 코드에서 25/25가 통과한 것을 확인한 뒤 3단계로 넘어감.

## 3·4단계: 점진 변환 + 배치별 검증

워커는 최대 3명이 동시에 일함. 배치는 의존이 모두 verified가 되면 바로 시작함.

```
[B1 B6 B7] 병렬 변환 → 각각 검증 PASS
     └─ B1 verified → B2 → PASS
                        └─ B3 → PASS
                             └─ B4 → PASS
                                  └─ B5 (B7 포함 의존 충족) → PASS
```

- 검증자는 매번 같은 4단계를 돌림.
  1. typecheck
  2. npm test
  3. 기준 트리 대비 경계 침범 확인
  4. any와 로직 변경 확인
- 7개 배치 모두 **첫 시도에 PASS**함. 재시도와 롤백은 0건임.

## 최종 확인 (감독자 직접 실행)
```
npm run typecheck        → 오류 0
npm test                 → Test Files 4 passed (4), Tests 25 passed (25)
git diff --stat 7311b34  → 20 files changed, 44 insertions(+), 44 deletions(-)
git log                  → 커밋 없음
```
