"""
Dashboard Pydantic schemas used across Planner, SQL Agent, and Formatter.
"""

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, RootModel

# ── Planner ──────────────────────────────────────────────────────────────────


class PlannerTask(BaseModel):
    tool: Literal["sql"] = Field(description="Tool used to execute the task.")
    display: Literal["table", "chart", "kpi"] = Field(
        description="Frontend display type."
    )
    chart_type: Literal["bar", "line", "pie", "none"] = Field(
        description="Chart type. Use 'none' if display is not chart."
    )
    question: str = Field(description="Natural language query for the SQL agent.")


class PlannerOutput(RootModel[List[PlannerTask]]):
    pass


# ── Formatter ────────────────────────────────────────────────────────────────


class ChartDataset(BaseModel):
    label: str
    data: List[float | None]

    # Dataset colors
    backgroundColor: Any = None
    borderColor: Any = None

    # Dataset style
    borderWidth: int = 2
    fill: bool = False
    tension: float = 0.3

    # Bar chart
    borderRadius: int = 4


class ChartTicks(BaseModel):
    color: str = "#666666"


class ChartGrid(BaseModel):
    color: str = "#dddddd"


class ChartAxis(BaseModel):
    ticks: ChartTicks = ChartTicks()
    grid: ChartGrid = ChartGrid()


class ChartLegend(BaseModel):
    color: str = "#333333"


class ChartOptions(BaseModel):
    legend: ChartLegend = ChartLegend()
    scales: Dict[str, ChartAxis] = {"x": ChartAxis(), "y": ChartAxis()}


class ChartData(BaseModel):
    labels: List[str]
    datasets: List[ChartDataset]


class Chart(BaseModel):
    type: Literal["bar", "line", "pie"]
    data: ChartData
    options: Optional[ChartOptions] = None


class DashboardOutput(BaseModel):
    summary: str
    display: Literal["table", "chart", "kpi"]
    table: List[Dict[str, Any]]
    chart: Optional[Chart] = None


# ── Query Analysis ────────────────────────────────────────────────────────────


class QueryOption(BaseModel):
    """
    A suggested option the user can select to enhance their question.

    - id: unique identifier (e.g. "dimension_1", "filter_1")
    - label: short display text (e.g. "By category")
    - context: longer explanation of what this adds
    - suggestion: the text snippet to append to the original question
    """

    id: str
    label: str
    context: str
    suggestion: str = ""


class QueryAnalysis(BaseModel):
    """
    Result of analyzing a dashboard query.

    - clear: whether the question is actionable as-is
    - reason: explanation of why it's clear or what's missing
    - enhanced_question: the original question with selected options appended
    - options: list of suggested enhancements the user can pick from
    - chatbot_response: if the question is off-topic (not about business data),
      this contains a friendly chatbot answer; otherwise empty.
    """

    clear: bool
    reason: str
    enhanced_question: str = ""
    options: list[QueryOption] = []
    chatbot_response: str = ""