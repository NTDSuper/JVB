"""
Dashboard Pydantic schemas used across Planner, SQL Agent, and Formatter.
"""

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, RootModel


# ── Planner ──────────────────────────────────────────────────────────────────

class PlannerTask(BaseModel):
    tool: Literal["sql"] = Field(
        description="Tool used to execute the task."
    )
    display: Literal["table", "chart", "kpi"] = Field(
        description="Frontend display type."
    )
    chart_type: Literal["bar", "line", "pie", "none"] = Field(
        description="Chart type. Use 'none' if display is not chart."
    )
    question: str = Field(
        description="Natural language query for the SQL agent."
    )


class PlannerOutput(RootModel[List[PlannerTask]]):
    pass


# ── Formatter ────────────────────────────────────────────────────────────────

class ChartDataset(BaseModel):
    label: str
    data: List[float]
    backgroundColor: Any = None
    borderColor: Any = None
    borderWidth: int = 1
    fill: bool = False
    tension: float = 0.1


class ChartData(BaseModel):
    labels: List[str]
    datasets: List[ChartDataset]


class Chart(BaseModel):
    type: Literal["bar", "line", "pie"]
    data: ChartData


class DashboardOutput(BaseModel):
    summary: str
    display: Literal["table", "chart", "kpi"]
    table: List[Dict[str, Any]]
    chart: Optional[Chart] = None