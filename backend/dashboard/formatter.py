"""
Formatter: Convert SQL results into frontend-ready dashboard JSON.
"""

import json
import logging
import re
from typing import Any, Dict, List

from langchain_core.output_parsers import PydanticOutputParser

from .schemas import DashboardOutput, PlannerTask

logger = logging.getLogger(__name__)

# ── Parser ───────────────────────────────────────────────────────────────────

formatter_parser = PydanticOutputParser(pydantic_object=DashboardOutput)


def _extract_json(text: str) -> str:
    """Extract JSON object from LLM response (handles markdown fences, extra text)."""
    # Try to find ```json ... ``` block
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if match:
        return match.group(1).strip()

    # Try to find {...} object directly
    match = re.search(r"(\{[\s\S]*\})", text)
    if match:
        return match.group(1).strip()

    return text.strip()


def _parse_dashboard_fallback(text: str) -> DashboardOutput:
    """Fallback: parse JSON manually when PydanticOutputParser fails."""
    cleaned = _extract_json(text)
    data = json.loads(cleaned)

    return DashboardOutput(
        summary=data.get("summary", ""),
        display=data.get("display", "table"),
        table=data.get("table", []),
        chart=data.get("chart"),
    )


def run_formatter(
    llm,
    user_question: str,
    sql_result: str,
    task: PlannerTask,
) -> DashboardOutput:
    """Format SQL result into a DashboardOutput object."""
    logger.info(f"Formatter: formatting result for display={task.display}")

    prompt = f"""
{formatter_parser.get_format_instructions()}

You are a Dashboard Formatter AI.
Your job is to transform SQL results into a visualization-friendly dashboard output.

User Question:
{user_question}

Display:
{task.display}

Chart Type:
{task.chart_type}

Database Result:
{sql_result}


## Chart Styling Rules

If display is "chart", decide appropriate chart colors.

Return chart styling fields following these rules:

1. borderColor:
- Use a consistent color that matches the meaning of the metric.
- Revenue / sales / income:
  use green tones (#4CAF50, #2E7D32).
- Cost / expense / loss:
  use red/orange tones (#F44336, #FF9800).
- Customer count / users:
  use blue tones (#2196F3, #1565C0).
- Orders / transactions:
  use purple tones (#9C27B0).
- Inventory / stock:
  use teal tones (#009688).

2. backgroundColor:
- For bar charts:
  - Use solid colors.
  - If comparing categories, you may use an array of colors.
- For line charts:
  - Use transparent/light background colors if fill is enabled.

3. Color consistency:
- Use the same borderColor for the same metric across charts.
- Avoid random colors.
- Avoid too many colors unless comparing multiple series.

4. Chart readability:
- borderWidth should normally be 2.
- For line charts:
  - tension should be between 0.2 and 0.4.
  - fill should usually be false.
- For bar charts:
  - borderRadius should be 4-8.

5. Label colors:
- Axis labels should use:
  "#666666"
- Legend labels should use:
  "#333333"


Now format the database result.
"""

    response = llm.invoke(prompt)
    raw = response.content

    # Try Pydantic parser first, fallback to manual JSON
    try:
        dashboard = formatter_parser.parse(raw)
    except Exception as e:
        logger.warning(f"Pydantic formatter failed: {e}, trying fallback...")
        try:
            dashboard = _parse_dashboard_fallback(raw)
        except Exception as e2:
            logger.error(f"Formatter fallback also failed: {e2}")
            logger.debug(f"Raw LLM output: {raw}")
            # Return minimal valid output
            dashboard = DashboardOutput(
                summary="Error formatting result",
                display="table",
                table=[],
                chart=None,
            )

    logger.info(f"Formatter: formatted as {dashboard.display}")
    return dashboard