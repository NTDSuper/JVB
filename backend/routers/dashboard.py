"""
Dashboard API Router.
"""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Any, Optional
from models.users_model import User
from routers.auth import get_current_user, get_permission_codes
from services.dashboard_service import DashboardService
from dashboard.schemas import QueryAnalysis

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"],
)


class DashboardRequest(BaseModel):
    question: str
    # Resume support: frontend sends these when resuming a partial session
    start_index: int = 0
    existing_widgets: list[dict[str, Any]] | None = None
    session_id: str | None = None


class AnalyzeRequest(BaseModel):
    question: str


class AnalyzeResponse(BaseModel):
    success: bool
    data: QueryAnalysis | None = None
    error: str | None = None


class DashboardResponse(BaseModel):
    success: bool
    data: list[dict[str, Any]]
    error: str | None = None


class HistoryListResponse(BaseModel):
    success: bool
    data: list[dict[str, Any]]
    total: int = 0


class HistoryDetailResponse(BaseModel):
    success: bool
    data: dict[str, Any] | None = None
    error: str | None = None


class SessionResponse(BaseModel):
    success: bool
    data: dict[str, Any] | None = None
    error: str | None = None


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_question(
    req: AnalyzeRequest, current_user: User = Depends(get_current_user)
):
    """
    Analyze a natural language question and suggest enhancements.

    Returns:
      - clear: whether the question is actionable as-is
      - reason: explanation
      - options: 2-5 suggested enhancements with selectable options
    """
    try:
        logger.info(f"Analyze request: {req.question}")
        analysis = DashboardService.analyze_question(
            req.question,
            user_id=current_user.id,
        )

        return AnalyzeResponse(
            success=True,
            data=analysis,
        )

    except HTTPException as e:
        return AnalyzeResponse(
            success=False,
            error=e.detail,
        )
    except Exception as e:
        logger.exception(f"Analyze failed: {e}")
        return AnalyzeResponse(
            success=False,
            error=str(e),
        )


@router.post("/", response_model=DashboardResponse)
async def create_dashboard(
    req: DashboardRequest, current_user: User = Depends(get_current_user)
):
    """
    Create a dashboard from a natural language question.

    Pipeline:
        1. Planner: Decompose question into SQL tasks
        2. SQL Agent: Execute each task against the database
        3. Formatter: Format results into frontend-ready JSON

    Returns a list of dashboard widgets (table, chart, kpi).
    """

    try:
        logger.info(f"Dashboard request: {req.question}")
        result = DashboardService.create_dashboard(req.question)

        return DashboardResponse(
            success=True,
            data=result,
        )

    except HTTPException as e:
        return DashboardResponse(
            success=False,
            data=[],
            error=e.detail,
        )
    except Exception as e:
        logger.exception(f"Dashboard pipeline failed: {e}")
        return DashboardResponse(
            success=False,
            data=[],
            error=str(e),
        )


@router.post("/stream")
async def create_dashboard_stream(
    req: DashboardRequest, current_user: User = Depends(get_current_user)
):
    """
    Streaming dashboard endpoint using Server-Sent Events (SSE).

    Each SSE event corresponds to one completed widget, so the frontend
    can display results incrementally without waiting for all tasks.

    Event types:
      - plan:    { "type": "plan", "total": N, "session_id": "..." }
      - widget:  { "type": "widget", "index": i, "total": N, "widget": {...}, "session_id": "..." }
      - error:   { "type": "error", "index": i, "total": N, "widget": {...}, "session_id": "..." }
      - done:    { "type": "done", "session_id": "...", "history_id": "..." }

    Session tracking: When user_id is available, progress is saved to Redis
    per-task and the completed session is persisted to MongoDB.

    Resume support: Pass start_index > 0 and existing_widgets to resume
    a partial session without re-running completed tasks.
    """
    logger.info(
        f"Dashboard stream request: {req.question} (user={current_user.id}, "
        f"start_index={req.start_index}, session_id={req.session_id})"
    )

    def event_generator():
        try:
            for event in DashboardService.stream_dashboard(
                req.question,
                user_id=current_user.id,
                session_id=req.session_id,
                start_index=req.start_index,
                existing_widgets=req.existing_widgets,
            ):
                yield event
        except Exception as e:
            logger.exception(f"Dashboard stream failed: {e}")
            yield f"data: {json.dumps({'type': 'error', 'widget': {'summary': f'Pipeline error: {str(e)}', 'display': 'table', 'table': [], 'chart': None}})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Session Recovery (page reload) ────────────────────────────────────────────


@router.get("/session/active")
async def get_active_session(current_user: User = Depends(get_current_user)):
    """
    Check if the user has an active (in-progress) dashboard session in Redis.
    Used on page reload to resume the streaming session without losing data.
    """
    try:
        session = DashboardService.get_active_session(current_user.id)
        if session:
            completed_tasks = session.get("completed_tasks", [])
            total_tasks = session.get("total_tasks", 0)
            non_null_completed = [t for t in completed_tasks if t is not None]
            if len(non_null_completed) >= total_tasks and total_tasks > 0:
                logger.info(
                    f"Active session {session['session_id']} is already fully completed. Finalizing to MongoDB."
                )
                from services.dashboard_history_service import finalize_session

                doc_id = finalize_session(
                    session_id=session["session_id"],
                    user_id=current_user.id,
                    question=session["question"],
                    widgets=non_null_completed,
                    tasks=session.get("tasks", []),
                )
                session["completed"] = True
                session["history_id"] = doc_id or ""
                session["completed_tasks"] = non_null_completed
        return SessionResponse(
            success=True,
            data=session,
        )
    except Exception as e:
        logger.exception(f"Get active session failed: {e}")
        return SessionResponse(
            success=False,
            error=str(e),
        )


@router.get("/session/{session_id}")
async def get_session_by_id(
    session_id: str, current_user: User = Depends(get_current_user)
):
    """
    Get a specific Redis session by session_id.
    """
    try:
        session = DashboardService.get_redis_session(session_id)
        if session:
            completed_tasks = session.get("completed_tasks", [])
            total_tasks = session.get("total_tasks", 0)
            non_null_completed = [t for t in completed_tasks if t is not None]
            if len(non_null_completed) >= total_tasks and total_tasks > 0:
                logger.info(
                    f"Session {session_id} is already fully completed. Finalizing to MongoDB."
                )
                from services.dashboard_history_service import finalize_session

                doc_id = finalize_session(
                    session_id=session_id,
                    user_id=current_user.id,
                    question=session["question"],
                    widgets=non_null_completed,
                    tasks=session.get("tasks", []),
                )
                session["completed"] = True
                session["history_id"] = doc_id or ""
                session["completed_tasks"] = non_null_completed
        return SessionResponse(
            success=True,
            data=session,
        )
    except Exception as e:
        logger.exception(f"Get session failed: {e}")
        return SessionResponse(
            success=False,
            error=str(e),
        )


@router.delete("/session/{session_id}")
async def delete_redis_session(
    session_id: str, current_user: User = Depends(get_current_user)
):
    """
    Delete a Redis dashboard session (used when reloading — clean up old session before resuming).
    """
    try:
        deleted = DashboardService.delete_redis_session(session_id)
        return {"success": deleted, "deleted": deleted}
    except Exception as e:
        logger.exception(f"Delete Redis session failed: {e}")
        return {"success": False, "deleted": False, "error": str(e)}


@router.post("/session/{session_id}/cancel")
async def cancel_dashboard_session(
    session_id: str, current_user: User = Depends(get_current_user)
):
    """
    Cancel a running dashboard session: delete the Redis session so it won't auto-resume on reload.
    The frontend calls this when the user clicks Cancel.
    """
    try:
        deleted = DashboardService.delete_redis_session(session_id)
        logger.info(
            f"Dashboard session cancelled by user: {session_id} (deleted={deleted})"
        )
        return {"success": True, "cancelled": deleted}
    except Exception as e:
        logger.exception(f"Cancel dashboard session failed: {e}")
        return {"success": False, "cancelled": False, "error": str(e)}


# ── History (MongoDB) ──────────────────────────────────────────────────────────


@router.get("/history")
async def get_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    """
    Get completed dashboard query history for the current user from MongoDB.
    Results are sorted newest-first.
    """
    try:
        history = DashboardService.get_user_history(
            current_user.id,
            skip=skip,
            limit=limit,
        )
        return HistoryListResponse(
            success=True,
            data=history,
            total=len(history),
        )
    except Exception as e:
        logger.exception(f"Get history failed: {e}")
        return HistoryListResponse(
            success=False,
            data=[],
            total=0,
        )


@router.get("/history/{doc_id}")
async def get_history_detail(
    doc_id: str, current_user: User = Depends(get_current_user)
):
    """
    Get a single dashboard history document by MongoDB _id.
    """
    try:
        detail = DashboardService.get_history_detail(doc_id)
        if detail is None:
            return HistoryDetailResponse(
                success=False,
                data=None,
                error="History not found",
            )
        return HistoryDetailResponse(
            success=True,
            data=detail,
        )
    except Exception as e:
        logger.exception(f"Get history detail failed: {e}")
        return HistoryDetailResponse(
            success=False,
            data=None,
            error=str(e),
        )


@router.delete("/history/{doc_id}")
async def delete_history(doc_id: str, current_user: User = Depends(get_current_user)):
    """
    Delete a dashboard history document (owner check enforced).
    """
    try:
        deleted = DashboardService.delete_history(current_user.id, doc_id)
        return {"success": deleted, "deleted": deleted}
    except Exception as e:
        logger.exception(f"Delete history failed: {e}")
        return {"success": False, "deleted": False, "error": str(e)}
