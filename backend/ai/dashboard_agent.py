import json
import logging
import os
from typing import Any, Dict, List, Literal, Optional

from dotenv import load_dotenv
from langchain_community.agent_toolkits import create_sql_agent
from langchain_community.utilities import SQLDatabase
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from pydantic import BaseModel, Field, RootModel

load_dotenv()

logger = logging.getLogger(__name__)

# =============================================================================
# Configuration
# =============================================================================

API_KEY = os.getenv("NVIDIA_API_KEY", "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")
MODEL = "qwen/qwen3.5-397b-a17b"
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:123456@localhost:3307/mydb")

# =============================================================================
# Pydantic Schemas
# =============================================================================

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

# =============================================================================
# Parsers
# =============================================================================

planner_parser = PydanticOutputParser(pydantic_object=PlannerOutput)
formatter_parser = PydanticOutputParser(pydantic_object=DashboardOutput)

# =============================================================================
# Prompts
# =============================================================================

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

# =============================================================================
# LLM Instance
# =============================================================================

llm = ChatNVIDIA(
    model=MODEL,
    api_key=API_KEY,
    temperature=0.6,
    top_p=0.95,
    max_completion_tokens=16384,
)

# =============================================================================
# SQL Database & Agent
# =============================================================================

db = SQLDatabase.from_uri(DATABASE_URL)

sql_agent = create_sql_agent(
    llm=llm,
    db=db,
    agent_type="tool-calling",
    verbose=False,
    agent_executor_kwargs={
        "handle_parsing_errors": True,
    },
)

# =============================================================================
# Dashboard Pipeline
# =============================================================================

def run_planner(question: str) -> List[PlannerTask]:
    """Step 1: Decompose user question into tasks."""
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


def run_sql_agent(task: PlannerTask) -> str:
    """Step 2: Execute SQL query for a single task."""
    logger.info(f"SQL Agent: executing query for task: {task.question}")

    result = sql_agent.invoke({"input": task.question})
    output = result["output"]

    logger.info(f"SQL Agent: got result of length {len(output)}")
    return output


def run_formatter(
    user_question: str,
    sql_result: str,
    task: PlannerTask,
) -> DashboardOutput:
    """Step 3: Format SQL result into dashboard JSON."""
    logger.info(f"Formatter: formatting result for display={task.display}")

    formatter_prompt_text = f"""
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

    response = llm.invoke(formatter_prompt_text)
    dashboard = formatter_parser.parse(response.content)

    logger.info(f"Formatter: formatted as {dashboard.display}")
    return dashboard


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
    tasks = run_planner(question)

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
            sql_output = run_sql_agent(task)
            formatted = run_formatter(question, sql_output, task)
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