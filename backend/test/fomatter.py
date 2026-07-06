from typing import Any, Dict, List, Literal

from pydantic import BaseModel, Field
from langchain_core.output_parsers import PydanticOutputParser


class ChartDataset(BaseModel):
    label: str

    data: List[float]

    backgroundColor: Any | None = None

    borderColor: Any | None = None

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

    chart: Chart | None = None


formatter_parser = PydanticOutputParser(
    pydantic_object=DashboardOutput
)