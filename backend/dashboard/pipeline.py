"""
Dashboard Pipeline: Orchestrates Planner → SQL Agent → Formatter.
Supports optional session tracking via Redis (in-progress) / MongoDB (completed).
"""

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional

from dotenv import load_dotenv
from langchain_deepseek import ChatDeepSeek

from .formatter import run_formatter
from .planner import run_planner
from .sql_agent import create_agent, run_sql_agent
from .schemas import PlannerTask
from services.dashboard_history_service import (
    create_session,
    finalize_session,
    get_session,
    update_task_progress,
    # get_active_session_for_user,
    # delete_session,
    delete_all_sessions_for_user,
)

# Load .env from backend/ directory
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

logger = logging.getLogger(__name__)

# ── LLM Configuration ────────────────────────────────────────────────────────

API_KEY = os.getenv("DEEPSEEK_API_KEY")
MODEL = "deepseek-chat"

logger.info(f"Model: {MODEL}")

llm = ChatDeepSeek(
    model=MODEL,
    api_key=API_KEY,
    temperature=0.6,
    top_p=0.95,
)

# ── SQL Agent (singleton) ────────────────────────────────────────────────────

sql_agent = create_agent(llm)


def dashboard_pipeline(question: str) -> List[Dict[str, Any]]:
    """
    Full pipeline: Planner → SQL Agent → Formatter.

    Args:
        question: Natural language user request (e.g. "Show monthly revenue").

    Returns:
        List of dashboard widgets ready for frontend consumption.
    """
    logger.info("=" * 60)
    logger.info(f"Dashboard Pipeline: {question}")
    logger.info("=" * 60)

    # Step 1: Plan
    tasks = run_planner(llm, question)

    if not tasks:
        logger.warning("Planner returned no tasks.")
        return []

    dashboard_results = []

    # Step 2 & 3: Execute each task
    for i, task in enumerate(tasks):
        logger.info(f"\n{'=' * 50}")
        logger.info(f"Processing task {i+1}/{len(tasks)}")
        logger.info(f"{'=' * 50}")

        try:
            sql_output = run_sql_agent(sql_agent, task)
            formatted = run_formatter(llm, question, sql_output, task)
            print(task)
            print("-" * 50)
            print(sql_output)
            print("-" * 50)
            print(formatted)
            dashboard_results.append(formatted.model_dump())
        except Exception as e:
            logger.exception(f"Task {i+1} failed: {e}")
            dashboard_results.append(
                {
                    "summary": f"Error processing task: {str(e)}",
                    "display": "table",
                    "table": [],
                    "chart": None,
                }
            )

    logger.info(f"\nDashboard complete: {len(dashboard_results)} widget(s)")
    return dashboard_results


def dashboard_pipeline_stream(
    question: str,
    user_id: Optional[int] = None,
    session_id: Optional[str] = None,
    start_index: int = 0,
    existing_widgets: Optional[List[Dict[str, Any]]] = None,
) -> Generator[str, None, None]:
    """
    Streaming pipeline: Planner → for each task: SQL Agent → Formatter → yield SSE event.
    Tracks progress in Redis per-task & persists completed session to MongoDB.

    Resume logic:
      - If session_id is provided and exists in Redis, the original task plan is
        restored from Redis — NO extra LLM planner call.
      - Only tasks from start_index onward are executed.
      - existing_widgets (already-completed results) are prepended to collected_widgets
        so MongoDB receives the full history.
      - When Redis session is not found (e.g. expired), falls back to re-planning.

    SSE event types:
      - plan:    { "type": "plan", "total": N, "tasks": [...], "session_id": "...", "resume": bool }
      - task:    { "type": "task", "index": i, "total": N, ... }
      - widget:  { "type": "widget", "index": i, "total": N, "widget": {...}, "session_id": "..." }
      - error:   { "type": "error", "index": i, "total": N, "widget": {...}, "session_id": "..." }
      - done:    { "type": "done", "session_id": "...", "history_id": "..." }
    """
    logger.info("=" * 60)
    logger.info(f"Dashboard Pipeline (streaming): {question}")
    logger.info(f"  session_id={session_id}, start_index={start_index}")
    logger.info("=" * 60)

    # ── Step 1: Determine task plan ──────────────────────────────────────────
    # When resuming, restore tasks from Redis so we don't call the LLM planner
    # again (which could yield a different set of tasks).
    tasks: List[PlannerTask] = []
    active_session_id = session_id
    redis_tasks_restored = False

    if session_id and start_index > 0:
        try:
            cached = get_session(session_id)
            if cached and cached.get("tasks"):
                # get_session() already parses the JSON — tasks is a list of dicts
                raw_tasks: List[Dict[str, Any]] = cached["tasks"]
                tasks = [
                    PlannerTask(
                        tool=t.get("tool", "sql"),
                        display=t.get("display", "table"),
                        chart_type=t.get("chart_type", "none"),
                        question=t.get("question", ""),
                    )
                    for t in raw_tasks
                ]
                redis_tasks_restored = True
                logger.info(
                    f"Restored {len(tasks)} task(s) from Redis session {session_id}"
                )
        except Exception as e:
            logger.warning(f"Failed to restore tasks from Redis, will re-plan: {e}")

    if not tasks:
        # Fresh start OR Redis session expired — call the LLM planner
        tasks = run_planner(llm, question)
        redis_tasks_restored = False

    if not tasks:
        logger.warning("Planner returned no tasks.")
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        return

    total = len(tasks)
    task_details = [
        {
            "question": task.question,
            "display": task.display,
            "chart_type": task.chart_type,
        }
        for task in tasks
    ]

    # ── Create / recreate Redis session as needed ────────────────────────────
    if user_id is not None and not active_session_id:
        # Brand-new session: clean up ALL existing sessions for this user first
        # to guarantee there is ONLY 1 active session per user at any time.
        try:
            deleted = delete_all_sessions_for_user(user_id)
            if deleted > 0:
                logger.info(
                    f"Cleared {deleted} old active session(s) for user {user_id}"
                )
        except Exception as e:
            logger.warning(f"Failed to clear old active sessions: {e}")

        try:
            active_session_id = create_session(
                user_id=user_id,
                question=question,
                total_tasks=total,
                tasks=task_details,
            )
            logger.info(f"Session tracking enabled: {active_session_id}")
        except Exception as e:
            logger.warning(f"Failed to create Redis session (continuing without): {e}")
    elif user_id is not None and active_session_id and not redis_tasks_restored:
        # Redis session expired mid-way — create a fresh one with re-planned tasks
        try:
            active_session_id = create_session(
                user_id=user_id,
                question=question,
                total_tasks=total,
                tasks=task_details,
            )
            logger.info(f"Redis session expired, created new: {active_session_id}")
        except Exception as e:
            logger.warning(f"Failed to recreate Redis session: {e}")

    # ── Emit plan event ──────────────────────────────────────────────────────
    yield f"data: {json.dumps({
        'type': 'plan',
        'total': total,
        'tasks': task_details,
        'session_id': active_session_id or '',
        'resume': start_index > 0,
        'start_index': start_index,
    })}\n\n"

    # ── collected_widgets starts with already-completed widgets ───────────────
    # so finalize_session() can persist the full result set.
    collected_widgets: List[Dict[str, Any]] = (
        list(existing_widgets) if existing_widgets else []
    )

    # ── Step 2 & 3: Execute only remaining tasks ─────────────────────────────
    try:
        for i in range(start_index, total):
            task = tasks[i]
            logger.info(f"\n{'=' * 50}")
            logger.info(f"Processing task {i+1}/{total}")
            logger.info(f"{'=' * 50}")

            # Notify frontend which task is running
            yield f"data: {json.dumps({
                'type': 'task',
                'index': i,
                'total': total,
                'question': task.question,
                'display': task.display,
                'chart_type': task.chart_type,
            })}\n\n"

            try:
                sql_output = run_sql_agent(sql_agent, task)
                formatted = run_formatter(llm, question, sql_output, task)
                print(task)
                print("-" * 50)
                print(sql_output)
                print("-" * 50)
                print(formatted)
                widget = formatted.model_dump()
                collected_widgets.append(widget)

                # Persist per-task progress to Redis
                if active_session_id:
                    try:
                        update_task_progress(active_session_id, i, widget=widget)
                    except Exception as e:
                        logger.warning(f"Failed to update task progress in Redis: {e}")

                yield f"data: {json.dumps({
                    'type': 'widget',
                    'index': i,
                    'total': total,
                    'widget': widget,
                    'session_id': active_session_id or '',
                })}\n\n"

            except Exception as e:
                logger.exception(f"Task {i+1} failed: {e}")
                error_widget = {
                    "summary": f"Error processing task: {str(e)}",
                    "display": "table",
                    "table": [],
                    "chart": None,
                }
                collected_widgets.append(error_widget)

                if active_session_id:
                    try:
                        update_task_progress(
                            active_session_id, i, widget=error_widget, is_error=True
                        )
                    except Exception as e:
                        logger.warning(f"Failed to update error progress in Redis: {e}")

                yield f"data: {json.dumps({
                    'type': 'error',
                    'index': i,
                    'total': total,
                    'widget': error_widget,
                    'session_id': active_session_id or '',
                })}\n\n"

        # ── Finalize: save ALL widgets to MongoDB, then delete Redis session ──────
        history_id = None
        if active_session_id and user_id is not None:
            # We ONLY finalize if we've collected all widgets
            if len(collected_widgets) >= total and total > 0:
                try:
                    history_id = finalize_session(
                        session_id=active_session_id,
                        user_id=user_id,
                        question=question,
                        widgets=collected_widgets,
                        tasks=task_details,
                    )
                except Exception as e:
                    logger.warning(f"Failed to finalize session to MongoDB: {e}")

        yield f"data: {json.dumps({
            'type': 'done',
            'session_id': active_session_id or '',
            'history_id': history_id or '',
        })}\n\n"

    finally:
        # Guaranteed cleanup block: if the generator exits early (e.g., client disconnects),
        # we check if all tasks were finished. If so, finalize it immediately!
        if active_session_id and user_id is not None:
            if len(collected_widgets) >= total and total > 0:
                # Check if it was already finalized in the try block
                cached = get_session(active_session_id)
                if cached:
                    try:
                        finalize_session(
                            session_id=active_session_id,
                            user_id=user_id,
                            question=question,
                            widgets=collected_widgets,
                            tasks=task_details,
                        )
                        logger.info(
                            "Session finalized in finally block due to early exit."
                        )
                    except Exception as e:
                        logger.warning(
                            f"Failed to finalize session in finally block: {e}"
                        )
