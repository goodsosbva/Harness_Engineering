# 05. 사람이 할 일

1. **커밋** — 저장소에 커밋이 하나도 없음. 변경은 작업 트리와 인덱스에만 있음.
   - 이력을 남기려면 먼저 기준 트리(`7311b34`, 마이그레이션 전 상태)로 첫 커밋을 만들고, 그 위에 변환분을 커밋하면 됨.
   - 예: `git commit-tree 7311b34 -m "legacy baseline"` → 그 커밋을 `master`로 지정(`git update-ref refs/heads/master <해시>`) → `git add -A && git commit`.
2. **`src/truncated.jsx`** — 파일이 중간에 잘려 있음. 원본을 찾아 복구한 뒤 다시 변환해야 함.
3. **레거시 버그 수정** — [04-legacy-bugs.md](04-legacy-bugs.md) 참고. 별도 작업으로 진행하고, 기준선 테스트도 함께 갱신해야 함.
4. **타입 구체화** — `Promise<unknown>`과 `id: string | number`는 임시값임. API 응답 스키마가 정해지면 `User` 타입 등으로 좁혀야 함.
5. **추가된 인프라 검토** — `package.json`, `tsconfig.json`, `node_modules/`, `.git/`은 이번에 새로 만든 것임. 유지할지 정해야 함.

## 상태 파일
- `legacy_migration/_workspace/migration/batches.json` — 7개 배치 모두 verified
- `legacy_migration/_workspace/migration/manual-queue.md` — truncated.jsx 1건
- `legacy_migration/_workspace/migration/base-tree.txt` — 기준 트리 해시
