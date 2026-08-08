"""
Dashboard Pydantic schemas used across Planner, SQL Agent, and Formatter.
"""

from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field, RootModel

# ── Planner ──────────────────────────────────────────────────────────────────

from typing import Literal
from pydantic import BaseModel, Field


class PlannerTask(BaseModel):
    tool: Literal["sql"] = Field(
        description="Tool used to execute the task."
    )

    display: Literal["table", "chart", "kpi"] = Field(
        description="Frontend display type."
    )

    chart_type: Literal[
        "bar",
        "line",
        "pie",
        "mixed",
        "doughnut",
        "none",
    ] = Field(
        description=(
            "Chart type when display='chart'. "
            "Use 'none' if display is not 'chart'. "
            "Choose 'mixed' when multiple metrics sharing the same X-axis "
            "should be visualized together (e.g. Revenue + Orders, Revenue + Profit, Revenue + Growth Rate)."
        )
    )

    question: str = Field(
        description="Natural language query for the SQL agent."
    )

class PlannerOutput(RootModel[List[PlannerTask]]):
    pass


# ── Formatter ────────────────────────────────────────────────────────────────

ChartType = Literal[
    "bar",
    "line",
    "pie",
    "mixed",
    "doughnut",
]

DatasetType = Literal[
    "bar",
    "line",
    "pie",
    "doughnut"
]


class ChartDataset(BaseModel):
    label: str
    data: List[Union[float, int, None]]

    # Mixed chart: specify dataset type (None = uses chart's type)
    type: Optional[DatasetType] = None

    # Colors
    backgroundColor: Any = None
    borderColor: Any = None

    # Style
    borderWidth: Union[float, int] = 2
    fill: bool = False
    tension: float = 0.3
    borderRadius: Union[float, int] = 4

    # Dual axis (for mixed charts)
    yAxisID: Optional[str] = None

    # Stacked chart
    stack: Optional[str] = None


class ChartTicks(BaseModel):
    color: str = "#666666"


class ChartGrid(BaseModel):
    color: str = "#dddddd"
    drawOnChartArea: bool = True


class ChartAxis(BaseModel):
    ticks: ChartTicks = Field(default_factory=ChartTicks)
    grid: ChartGrid = Field(default_factory=ChartGrid)

    beginAtZero: bool = True
    position: Optional[Literal["left", "right"]] = None
    title: Optional[Dict[str, Any]] = None
    border: Optional[Dict[str, Any]] = None
    stacked: Optional[bool] = None


class ChartLegend(BaseModel):
    display: bool = True
    labels: Optional[Dict[str, Any]] = None


class ChartOptions(BaseModel):
    legend: ChartLegend = Field(default_factory=ChartLegend)
    scales: Dict[str, ChartAxis] = Field(
        default_factory=lambda: {
            "x": ChartAxis(),
            "y": ChartAxis(),
        }
    )
    plugins: Optional[Dict[str, Any]] = None
    responsive: Optional[bool] = True
    maintainAspectRatio: Optional[bool] = False
    animation: Optional[Dict[str, Any]] = None


class ChartData(BaseModel):
    labels: List[str]
    datasets: List[ChartDataset]


class Chart(BaseModel):
    type: ChartType
    data: ChartData
    options: Optional[ChartOptions] = None


class DashboardOutput(BaseModel):
    summary: str
    display: Literal["table", "chart", "kpi"]

    table: List[Dict[str, Any]] = Field(default_factory=list)

    chart: Optional[Chart] = None


def build_dashboard_output(
    summary: str,
    display: str,
    table: List[Dict[str, Any]],
    chart: Optional[Dict[str, Any]] = None,
) -> DashboardOutput:
    """
    Build a DashboardOutput from potentially raw dicts.
    This handles the case where the LLM output doesn't perfectly match the Pydantic schema.
    Handles options, scales, and all chart types gracefully.
    """
    parsed_chart = None
    if chart is not None and display == "chart":
        try:
            # Try direct construction first
            parsed_chart = Chart(**chart)
        except Exception as e1:
            try:
                # Fallback: extract minimal valid chart data
                chart_type = chart.get("type", "bar")
                if chart_type not in ("bar", "line", "pie", "doughnut", "mixed"):
                    chart_type = "bar"
                
                data = chart.get("data", {})
                labels = data.get("labels", [])
                if not isinstance(labels, list):
                    labels = []
                
                datasets_raw = data.get("datasets", [])
                if not isinstance(datasets_raw, list):
                    datasets_raw = []
                
                # Ensure datasets have proper structure
                datasets = []
                for ds in datasets_raw:
                    if isinstance(ds, dict) and "label" in ds and "data" in ds:
                        ds_data = ds.get("data", [])
                        if not isinstance(ds_data, list):
                            ds_data = []
                        # Filter valid numeric values
                        ds_data = [
                            float(v) if v is not None and isinstance(v, (int, float)) else None 
                            for v in ds_data
                        ]
                        
                        datasets.append(ChartDataset(
                            label=str(ds["label"]),
                            data=ds_data,
                            backgroundColor=ds.get("backgroundColor"),
                            borderColor=ds.get("borderColor"),
                            borderWidth=ds.get("borderWidth", 2),
                            fill=ds.get("fill", False),
                            tension=ds.get("tension", 0.3),
                            borderRadius=ds.get("borderRadius", 4),
                            type=ds.get("type"),
                            yAxisID=ds.get("yAxisID"),
                            stack=ds.get("stack"),
                        ))
                
                if labels and datasets:
                    # Handle options separately to avoid Pydantic validation failures
                    options_raw = chart.get("options")
                    options_parsed = None
                    if options_raw and isinstance(options_raw, dict):
                        try:
                            options_parsed = ChartOptions(**options_raw)
                        except Exception:
                            # If options parsing fails, use default options
                            options_parsed = None
                    
                    parsed_chart = Chart(
                        type=chart_type,
                        data=ChartData(labels=labels, datasets=datasets),
                        options=options_parsed,
                    )
            except Exception as e2:
                import logging
                logging.getLogger(__name__).error(
                    f"build_dashboard_output fallback also failed: {e2}"
                )

    return DashboardOutput(
        summary=summary,
        display=display,
        table=table,
        chart=parsed_chart,
    )


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