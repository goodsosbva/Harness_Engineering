from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

from app import schemas
from app.database import Base, engine, get_db
from app.services import task_service

# 앱 시작 시 테이블을 만듭니다(데모용. 실제 서비스라면 마이그레이션 도구를 씁니다).
Base.metadata.create_all(bind=engine)

app = FastAPI(title="task-keeper")


@app.get("/tasks", response_model=list[schemas.TaskOut])
def list_tasks(db: Session = Depends(get_db)):
    return task_service.list_tasks(db)


@app.post("/tasks", response_model=schemas.TaskOut, status_code=201)
def create_task(payload: schemas.TaskCreate, db: Session = Depends(get_db)):
    return task_service.create_task(db, payload.title, payload.tags)


@app.get("/tasks/{task_id}", response_model=schemas.TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = task_service.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="task not found")
    return task
