"""
Dashboard Pipeline: Orchestrates Planner → SQL Agent → Formatter.
"""

import logging
import os
from pathlib import Path
from typing import Any, Dict, List

from dotenv import load_dotenv
from langchain_nvidia_ai_endpoints import ChatNVIDIA

from .formatter import run_formatter
from .planner import run_planner
from .sql_agent import create_agent, run_sql_agent

# Load .env from backend/ directory
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

logger = logging.getLogger(__name__)

# ── LLM Configuration ────────────────────────────────────────────────────────

API_KEY = os.getenv("NVIDIA_API_KEY")
MODEL = "qwen/qwen3.5-397b-a17b"

logger.info(f"Model: {MODEL}")

llm = ChatNVIDIA(
    model=MODEL,
    api_key=API_KEY,
    temperature=0.6,
    top_p=0.95,
    max_completion_tokens=16384,
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
            dashboard_results.append(formatted.model_dump())
        except Exception as e:
            logger.exception(f"Task {i+1} failed: {e}")
            dashboard_results.append({
                "summary": f"Error processing task: {str(e)}",
                "display": "table",
                "table": [],
                "chart": None,
            })

    logger.info(f"\nDashboard complete: {len(dashboard_results)} widget(s)")
    return dashboard_results