"""
Planner: Decompose user question into SQL tasks.
"""

import logging

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate

from .schemas import PlannerOutput

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


def run_planner(llm, question: str):
    """Decompose user question into a list of PlannerTask."""
    logger.info(f"Planner: processing question: {question}")

    chain = planner_prompt.partial(
        format_instructions=planner_parser.get_format_instructions()
    ) | llm

    response = chain.invoke({"question": question})
    tasks = planner_parser.parse(response.content).root

    logger.info(f"Planner: generated {len(tasks)} task(s)")
    for i, task in enumerate(tasks):
        logger.info(f"  Task {i+1}: display={task.display}, chart_type={task.chart_type}")

    return tasks