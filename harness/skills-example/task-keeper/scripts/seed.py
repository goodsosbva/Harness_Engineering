"""데모 데이터를 채웁니다. GET /tasks 의 N+1을 눈에 보이게 하려면 할 일이 여러 개 있어야 합니다.

실행: python scripts/seed.py [개수]
"""

import random
import sys

from app.database import Base, SessionLocal, engine
from app.models import Tag, Task

TAGS = ["업무", "개인", "긴급", "공부", "운동", "쇼핑"]


def seed(count: int = 100) -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        tag_objs: dict[str, Tag] = {}
        for name in TAGS:
            tag = db.query(Tag).filter(Tag.name == name).first()
            if tag is None:
                tag = Tag(name=name)
                db.add(tag)
            tag_objs[name] = tag
        db.flush()

        for i in range(count):
            picked = random.sample(TAGS, k=random.randint(1, 3))
            db.add(Task(title=f"할 일 {i + 1}", tags=[tag_objs[t] for t in picked]))
        db.commit()
        print(f"할 일 {count}개를 추가했습니다.")
    finally:
        db.close()


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    seed(n)
