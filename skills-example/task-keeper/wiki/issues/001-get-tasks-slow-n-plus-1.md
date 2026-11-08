# #1 [Bug] 할 일이 많을 때 GET /tasks 응답이 느림 (태그 N+1 쿼리)

- 링크: https://github.com/goodsosbva/task-keeper/issues/1
- 생성일: 2026-11-08
- 라벨: `bug`, `needs-triage`
- 상태: Open — PR #2로 해결 진행 중 (머지 시 자동 종료)
- 해결 PR: https://github.com/goodsosbva/task-keeper/pull/2 (커밋 `ce248b5`)

## 요약

`app/services/task_service.py`의 `list_tasks`가 `db.query(Task).all()`로 할 일만 조회합니다.
`Task.tags`는 lazy 로딩(`lazy="select"`)이므로, 응답을 직렬화할 때 할 일마다 태그 쿼리가 한 번씩 더 실행됩니다.
할 일이 N개면 쿼리가 1 + N번 실행됩니다.

## 확인 방법

`scripts/seed.py`로 데이터를 넣고 `SQLALCHEMY_ECHO=1`로 서버를 띄운 뒤 `GET /tasks`를 호출합니다.
콘솔에서 tags SELECT가 할 일 개수만큼 반복되는지 확인합니다.

## 제안된 수정

```python
from sqlalchemy.orm import selectinload
tasks = db.query(Task).options(selectinload(Task.tags)).all()
```

## 작업 기록

- 저장소에 `needs-triage` 라벨이 없어 새로 만들었습니다(색상 `#fbca04`).
- 저장소의 Issues 기능이 꺼져 있어 `gh repo edit --enable-issues`로 켰습니다.
- `list_tasks`에 `selectinload(Task.tags)`를 적용하고, 쿼리 수 테스트를 추가했습니다.
- 확인 결과: 할 일 50개 기준으로 쿼리가 51회에서 2회로 줄었습니다.
- `uv run pytest`는 로컬 Python이 3.14.0rc2라 pydantic 임포트에 실패해 돌리지 못했습니다.
