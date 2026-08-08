import json
import logging
from typing import Any, Optional

from fastapi import HTTPException, status

from dashboard.pipeline import dashboard_pipeline, dashboard_pipeline_stream, llm
from dashboard.query import analyze_dashboard_query
from dashboard.schemas import QueryAnalysis
from services.dashboard_history_service import (
    get_active_session_for_user,
    get_history_by_id,
    get_history_for_user,
    delete_history,
    get_session,
    delete_session as delete_redis_session,
)

logger = logging.getLogger(__name__)


class DashboardService:
    @staticmethod
    def _format_history_for_prompt(history: list[dict]) -> str:
        """
        Format the last N history entries into a readable string for the LLM prompt.
        Each entry shows the question and a summary of the widgets generated.
        """
        if not history:
            return ""

        lines = []
        for i, entry in enumerate(reversed(history), 1):
            question = entry.get("question", "?")
            widget_count = entry.get("widget_count", 0)
            tasks = entry.get("tasks", [])
            task_summaries = []
            for t in tasks:
                task_summaries.append(
                    f"({t.get('display', '?')}: {t.get('question', '?')})"
                )
            tasks_str = (
                ", ".join(task_summaries)
                if task_summaries
                else f"{widget_count} widget(s)"
            )
            lines.append(f'  {i}. "{question}" → {tasks_str}')

        return "\n".join(lines)

    @staticmethod
    def analyze_question(question: str, user_id: Optional[int] = None) -> QueryAnalysis:
        """Analyze a question and suggest enhancements, with memory of recent queries."""
        if not question or not question.strip():
            raise HTTPException(status_code=400, detail="Question is required")

        try:
            logger.info(f"Analyze question: {question} (user_id={user_id})")

            # Fetch last 5 history entries for context memory
            history_str = ""
            if user_id is not None:
                try:
                    recent_history = get_history_for_user(user_id, skip=0, limit=5)
                    if recent_history:
                        history_str = DashboardService._format_history_for_prompt(
                            recent_history
                        )
                        logger.info(
                            f"Loaded {len(recent_history)} history entries for context"
                        )
                except Exception as e:
                    logger.warning(f"Failed to load history for context: {e}")

            analysis = analyze_dashboard_query(llm, question, history=history_str)
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
    def stream_dashboard(
        question: str,
        user_id: Optional[int] = None,
        session_id: Optional[str] = None,
        start_index: int = 0,
        existing_widgets: Optional[list[dict]] = None,
    ):
        """Stream dashboard widgets as SSE events, one per task."""
        if not question or not question.strip():
            yield f"data: {json.dumps({'type': 'error', 'widget': {'summary': 'Question is required', 'display': 'table', 'table': [], 'chart': None}})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            return

        yield from dashboard_pipeline_stream(
            question=question,
            user_id=user_id,
            session_id=session_id,
            start_index=start_index,
            existing_widgets=existing_widgets,
        )

    # ── History & Session methods ──────────────────────────────────────────────

    @staticmethod
    def get_active_session(user_id: int) -> Optional[dict]:
        """
        Check if user has an active (in-progress) dashboard session in Redis.
        Used on page reload to resume the streaming session.
        """
        try:
            return get_active_session_for_user(user_id)
        except Exception as e:
            logger.warning(f"Failed to get active session: {e}")
            return None

    @staticmethod
    def get_redis_session(session_id: str) -> Optional[dict]:
        """Get session data from Redis by session_id."""
        try:
            return get_session(session_id)
        except Exception as e:
            logger.warning(f"Failed to get Redis session: {e}")
            return None

    @staticmethod
    def get_user_history(user_id: int, skip: int = 0, limit: int = 20) -> list[dict]:
        """Get completed dashboard history from MongoDB."""
        return get_history_for_user(user_id, skip=skip, limit=limit)

    @staticmethod
    def get_history_detail(doc_id: str) -> Optional[dict]:
        """Get a single history document by MongoDB _id."""
        return get_history_by_id(doc_id)

    @staticmethod
    def delete_history(user_id: int, doc_id: str) -> bool:
        """Delete a history document (owner check)."""
        return delete_history(doc_id, user_id)

    @staticmethod
    def delete_redis_session(session_id: str) -> bool:
        """Delete a Redis session by session_id."""
        return delete_redis_session(session_id)
