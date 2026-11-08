import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "sqlite:///./task_keeper.db"

# SQLALCHEMY_ECHO=1 로 실행하면 실제로 실행되는 SQL 쿼리가 콘솔에 출력됩니다. N+1 확인용.
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=os.getenv("SQLALCHEMY_ECHO") == "1",
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
