"""
MiniTrack — a minimalist team task tracker (FastAPI + SQLite).

This is the Day 3 practice repository for K21 Academy Course 2606.
It is deliberately small AND deliberately incomplete: there are a few
gaps you will close during the labs using the Plan -> Implement ->
Review -> Verify (PIRV) loop in Claude Code.

KNOWN GAPS (do NOT fix these by hand before the lab — let Claude do it):
  1. There is NO DELETE endpoint for a task.            (Lab 3.1, Implement)
  2. Task creation does NOT validate the input.         (Lab 3.1, Implement)
       - empty/blank title is accepted
       - priority can be any string (should be low|medium|high)
  3. There are NO tests at all.                          (Lab 3.1, Verify)
  4. The "completed" filter on GET /tasks is ignored.    (stretch goal)

Run it:
    pip install -r requirements.txt
    uvicorn app.main:app --reload
Then open http://127.0.0.1:8000/docs
"""
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from app import db

app = FastAPI(
    title="MiniTrack",
    description="A minimalist team task tracker — K21 Academy Day 3 practice repo.",
    version="0.1.0",
)


# --------------------------------------------------------------------------
# Schemas
# --------------------------------------------------------------------------
class TaskIn(BaseModel):
    # GAP #2: no validation here yet. title can be blank; priority is a free
    # string. The Lab 3.1 plan will tighten this (e.g. constrained types).
    title: str
    description: Optional[str] = None
    priority: str = "medium"


class Task(TaskIn):
    id: int
    completed: bool = False


# --------------------------------------------------------------------------
# Lifecycle
# --------------------------------------------------------------------------
@app.on_event("startup")
def _startup() -> None:
    db.init_db()


# --------------------------------------------------------------------------
# Routes
# --------------------------------------------------------------------------
@app.get("/health")
def health() -> dict:
    """Liveness probe. Handy as a first 'is it wired up?' check in the lab."""
    return {"status": "ok"}


@app.get("/tasks", response_model=list[Task])
def list_tasks(completed: Optional[bool] = None) -> list[dict]:
    # GAP #4 (stretch): the `completed` query param is accepted but ignored.
    return db.get_all_tasks()


@app.get("/tasks/{task_id}", response_model=Task)
def get_task(task_id: int) -> dict:
    task = db.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.post("/tasks", response_model=Task, status_code=201)
def create_task(payload: TaskIn) -> dict:
    # GAP #2: accepts anything Pydantic lets through — including a blank title.
    return db.create_task(
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
    )


@app.patch("/tasks/{task_id}", response_model=Task)
def update_task(task_id: int, payload: TaskIn) -> dict:
    task = db.update_task(
        task_id,
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
    )
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.post("/tasks/{task_id}/complete", response_model=Task)
def complete_task(task_id: int) -> dict:
    task = db.set_completed(task_id, True)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


# GAP #1: there is intentionally no DELETE /tasks/{task_id} endpoint.
# Lab 3.1 adds it (with a test) via the PIRV loop.
