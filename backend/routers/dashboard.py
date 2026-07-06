import json
import logging
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ai.dashboard_agent import dashboard_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"],
)


class DashboardRequest(BaseModel):
    question: str


class DashboardResponse(BaseModel):
    success: bool
    data: List[Dict[str, Any]]
    error: str | None = None


@router.post("/", response_model=DashboardResponse)
async def create_dashboard(req: DashboardRequest):
    """
    Create a dashboard from a natural language question.

    Pipeline:
        1. Planner: Decompose question into SQL tasks
        2. SQL Agent: Execute each task against the database
        3. Formatter: Format results into frontend-ready JSON

    Returns a list of dashboard widgets (table, chart, kpi).
    """
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="Question is required")

    try:
        logger.info(f"Dashboard request: {req.question}")

        result = dashboard_pipeline(req.question)

        return DashboardResponse(
            success=True,
            data=result,
        )

    except Exception as e:
        logger.exception(f"Dashboard pipeline failed: {e}")
        return DashboardResponse(
            success=False,
            data=[],
            error=str(e),
        )