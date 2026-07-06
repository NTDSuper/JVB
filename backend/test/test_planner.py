from typing import List, Literal

from pydantic import BaseModel, Field, RootModel
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate


# =========================
# Pydantic Schema
# =========================

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


# =========================
# Output Parser
# =========================

planner_parser = PydanticOutputParser(
    pydantic_object=PlannerOutput
)


# =========================
# Prompt
# =========================

planner_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
You are a Dashboard Planner.

Your job is to decompose the user's request into one or more independent SQL tasks.

Rules:

- Return ONLY valid JSON.
- Do NOT explain anything.
- Do NOT generate SQL.
- Every task must use:
    tool = "sql"

display must be one of:
- table
- chart
- kpi

chart_type must be one of:
- bar
- line
- pie
- none

If display != "chart"
then chart_type MUST be "none".

question should be a clear natural language query for the SQL agent.

If the request needs multiple visualizations,
return multiple tasks.

{format_instructions}
"""
        ),
        (
            "human",
            "{question}"
        ),
    ]
)


# =========================
# Planner Function
# =========================

def planner(llm, question: str) -> List[PlannerTask]:
    chain = planner_prompt.partial(
        format_instructions=planner_parser.get_format_instructions()
    ) | llm

    response = chain.invoke(
        {
            "question": question
        }
    )

    result = planner_parser.parse(response.content)

    return result.root