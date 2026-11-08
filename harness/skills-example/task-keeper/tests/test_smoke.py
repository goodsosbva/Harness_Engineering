def test_create_and_list(client):
    res = client.post("/tasks", json={"title": "테스트 할 일", "tags": ["개인", "긴급"]})
    assert res.status_code == 201
    body = res.json()
    assert body["title"] == "테스트 할 일"
    assert {t["name"] for t in body["tags"]} == {"개인", "긴급"}

    res = client.get("/tasks")
    assert res.status_code == 200
    tasks = res.json()
    assert len(tasks) == 1
    assert tasks[0]["tags"]


def test_list_tasks_query_count_is_constant(client, db_session):
    from sqlalchemy import event

    for i in range(5):
        client.post("/tasks", json={"title": f"할 일 {i}", "tags": [f"태그{i}"]})

    queries = []
    engine = db_session.get_bind()
    listener = lambda *args: queries.append(args[2])  # noqa: E731
    event.listen(engine, "before_cursor_execute", listener)
    try:
        res = client.get("/tasks")
    finally:
        event.remove(engine, "before_cursor_execute", listener)

    assert res.status_code == 200
    assert len(res.json()) == 5
    assert len(queries) == 2, queries  # 할 일 1회 + 태그 1회
