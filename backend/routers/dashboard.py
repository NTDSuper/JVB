"""
Dashboard API Router.
"""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Any
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


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_question(req: AnalyzeRequest, current_user: User = Depends(get_current_user)):
    """
    Analyze a natural language question and suggest enhancements.

    Returns:
      - clear: whether the question is actionable as-is
      - reason: explanation
      - options: 2-5 suggested enhancements with selectable options
    """
    try:
        logger.info(f"Analyze request: {req.question}")
        analysis = DashboardService.analyze_question(req.question)

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
async def create_dashboard(req: DashboardRequest, current_user: User = Depends(get_current_user)):
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
async def create_dashboard_stream(req: DashboardRequest, current_user: User = Depends(get_current_user)):
    """
    Streaming dashboard endpoint using Server-Sent Events (SSE).

    Each SSE event corresponds to one completed widget, so the frontend
    can display results incrementally without waiting for all tasks.

    Event types:
      - plan:    { "type": "plan", "total": N }
      - widget:  { "type": "widget", "index": i, "total": N, "widget": {...} }
      - error:   { "type": "error", "index": i, "total": N, "widget": {...} }
      - done:    { "type": "done" }
    """
    logger.info(f"Dashboard stream request: {req.question}")

    def event_generator():
        try:
            for event in DashboardService.stream_dashboard(req.question):
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