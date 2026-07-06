"""
Formatter: Convert SQL results into frontend-ready dashboard JSON.
"""

import logging

from langchain_core.output_parsers import PydanticOutputParser

from .schemas import DashboardOutput, PlannerTask

logger = logging.getLogger(__name__)

# ── Parser ───────────────────────────────────────────────────────────────────

formatter_parser = PydanticOutputParser(pydantic_object=DashboardOutput)


def run_formatter(llm, user_question: str, sql_result: str, task: PlannerTask) -> DashboardOutput:
    """Format SQL result into a DashboardOutput object."""
    logger.info(f"Formatter: formatting result for display={task.display}")

    prompt = f"""
{formatter_parser.get_format_instructions()}

User Question:
{user_question}

Display:
{task.display}

Chart Type:
{task.chart_type}

Database Result:
{sql_result}
"""

    response = llm.invoke(prompt)
    dashboard = formatter_parser.parse(response.content)

    logger.info(f"Formatter: formatted as {dashboard.display}")
    return dashboard