import json
import logging
from typing import Any

from fastapi import HTTPException, status

from dashboard.pipeline import dashboard_pipeline, dashboard_pipeline_stream, llm
from dashboard.query import analyze_dashboard_query
from dashboard.schemas import QueryAnalysis

logger = logging.getLogger(__name__)


class DashboardService:
    @staticmethod
    def analyze_question(question: str) -> QueryAnalysis:
        """Analyze a question and suggest enhancements."""
        if not question or not question.strip():
            raise HTTPException(status_code=400, detail="Question is required")

        try:
            logger.info(f"Analyze question: {question}")
            analysis = analyze_dashboard_query(llm, question)
            return analysis
        except Exception as e:
            logger.exception(f"Analyze failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @staticmethod
    def create_dashboard(question: str) -> list[dict[str, Any]]:
        """Create a dashboard from a natural language question."""
        if not question or not question.strip():
            raise HTTPException(status_code=400, detail="Question is required")

        try:
            logger.info(f"Dashboard request: {question}")
            result = dashboard_pipeline(question)
            return result
        except Exception as e:
            logger.exception(f"Dashboard pipeline failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @staticmethod
    def stream_dashboard(question: str):
        """Stream dashboard widgets as SSE events, one per task."""
        if not question or not question.strip():
            yield f"data: {json.dumps({'type': 'error', 'widget': {'summary': 'Question is required', 'display': 'table', 'table': [], 'chart': None}})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            return

        yield from dashboard_pipeline_stream(question)