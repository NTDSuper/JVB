"""
Planner: Decompose user question into SQL tasks.
"""

import json
import logging
import re

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate

from .schemas import PlannerOutput, PlannerTask

logger = logging.getLogger(__name__)

# ── Parser ───────────────────────────────────────────────────────────────────

planner_parser = PydanticOutputParser(pydantic_object=PlannerOutput)

# ── Prompt ───────────────────────────────────────────────────────────────────

planner_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """
You are a Dashboard Planner.

Your job is to decompose the user's request into one or more independent SQL tasks.

Rules:
- Return ONLY valid JSON.
- Do NOT explain anything.
- Do NOT generate SQL.
- Every task must use tool = "sql".
- display must be one of: table, chart, kpi.
- chart_type must be one of: bar, line, pie, none.
- If display != "chart" then chart_type MUST be "none".
- question should be a clear natural language query for the SQL agent.
- If the request needs multiple visualizations, return multiple tasks.

{format_instructions}
"""
    ),
    ("human", "{question}"),
])


def _extract_json(text: str) -> str:
    """Extract JSON array from LLM response (handles markdown fences, extra text)."""
    # Try to find ```json ... ``` block
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if match:
        return match.group(1).strip()

    # Try to find [...] array directly
    match = re.search(r"(\[[\s\S]*\])", text)
    if match:
        return match.group(1).strip()

    return text.strip()


def _parse_tasks_fallback(text: str) -> list[PlannerTask]:
    """Fallback: parse JSON manually when PydanticOutputParser fails."""
    cleaned = _extract_json(text)
    data = json.loads(cleaned)

    if isinstance(data, dict):
        # Sometimes LLM wraps in {"tasks": [...]} or similar
        for key in ("tasks", "root", "items"):
            if key in data and isinstance(data[key], list):
                data = data[key]
                break

    if not isinstance(data, list):
        data = [data]

    tasks = []
    for item in data:
        tasks.append(PlannerTask(
            tool=item.get("tool", "sql"),
            display=item.get("display", "table"),
            chart_type=item.get("chart_type", "none"),
            question=item.get("question", ""),
        ))

    return tasks


def run_planner(llm, question: str) -> list[PlannerTask]:
    """Decompose user question into a list of PlannerTask."""
    logger.info(f"Planner: processing question: {question}")

    chain = planner_prompt.partial(
        format_instructions=planner_parser.get_format_instructions()
    ) | llm

    response = chain.invoke({"question": question})
    raw = response.content

    # Try Pydantic parser first, fallback to manual JSON
    try:
        tasks = planner_parser.parse(raw).root
    except Exception as e:
        logger.warning(f"Pydantic parser failed: {e}, trying fallback...")
        try:
            tasks = _parse_tasks_fallback(raw)
        except Exception as e2:
            logger.error(f"Fallback also failed: {e2}")
            logger.debug(f"Raw LLM output: {raw}")
            return []

    logger.info(f"Planner: generated {len(tasks)} task(s)")
    for i, task in enumerate(tasks):
        logger.info(f"  Task {i+1}: display={task.display}, chart_type={task.chart_type}")

    return tasks