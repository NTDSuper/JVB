import os
import json
from dotenv import load_dotenv
from langchain_core.output_parsers import PydanticOutputParser
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits import create_sql_agent

from typing import List, Literal
from pydantic import BaseModel, Field


class AgentTask(BaseModel):
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
        description="Natural language question or SQL query request."
    )


class AgentPlan(BaseModel):
    tasks: List[AgentTask]

parser = PydanticOutputParser(
    pydantic_object=AgentPlan
)
#======================================================    
load_dotenv()

# ======================================================
# Config
# ======================================================


# ======================================================
# LLMs
# ======================================================

planner_llm = ChatNVIDIA(
  model="qwen/qwen3.5-397b-a17b",
  api_key=os.getenv("NVIDIA_API_KEY"),
  temperature=0.6,
  top_p=0.95,
  max_completion_tokens=16384,
)

sql_llm = ChatNVIDIA(
  model="qwen/qwen3.5-397b-a17b",
  api_key=os.getenv("NVIDIA_API_KEY"),
  temperature=0.6,
  top_p=0.95,
  max_completion_tokens=16384,
)

formatter_llm = ChatNVIDIA(
  model="qwen/qwen3.5-397b-a17b",
  api_key=os.getenv("NVIDIA_API_KEY"),
  temperature=0.6,
  top_p=0.95,
  max_completion_tokens=16384,
)

# ======================================================
# Database
# ======================================================

db = SQLDatabase.from_uri(
    os.getenv("DATABASE_URL")
)

# ======================================================
# SQL Agent
# ======================================================

sql_agent = create_sql_agent(
    llm=sql_llm,
    db=db,
    verbose=True,
    agent_executor_kwargs={
        "handle_parsing_errors": True
    }
)

# ======================================================
# Planner
# ======================================================

def planner(question: str):

    prompt = f"""
You are an AI Dashboard Planner.

Analyze the user request.

Return ONLY valid JSON.

Schema:

[{{
    "tool":"sql",
    "display":"table|chart|kpi",
    "chart_type":"bar|line|pie|none",
    "question":"database query"
}},{{
    "tool":"sql",
    "display":"table|chart|kpi",
    "chart_type":"bar|line|pie|none",
    "question":"database query"
}}]

User:

{question}
"""

    response = planner_llm.invoke(prompt)

    return json.loads(response.content)

# ======================================================
# SQL
# ======================================================

def query_database(question: str):

    response = sql_agent.invoke(
        {
            "input": question
        }
    )

    return response["output"]

# ======================================================
# Formatter
# ======================================================

def formatter(user_question, sql_result, display, chart_type):

    prompt = f"""
You are an AI Dashboard Formatter.

Convert SQL results into frontend JSON.

Return ONLY JSON.

Schema:

[{{
    "summary":"",

    "display":"",

    "table":[],

    "chart":{{
        "type":"",
        "data":{{
            "labels":[],
            "datasets":[]
        }}
    }}
}},{{
    "summary":"",

    "display":"",

    "table":[],

    "chart":{{
        "type":"",
        "data":{{
            "labels":[],
            "datasets":[]
        }}
    }}
}} ]

Display:

{display}

Chart Type:

{chart_type}

User Question:

{user_question}

SQL Result:

{sql_result}
"""

    response = formatter_llm.invoke(prompt)

    print("========== RESPONSE ==========")
    print(type(response))
    print("========== CONTENT ==========")
    print(repr(response.content))
    print("=============================")

    return json.loads(response.content)

# ======================================================
# Pipeline
# ======================================================

def dashboard_pipeline(question):

    print("=" * 50)
    print("Planner")
    print("=" * 50)

    plan = planner(question)

    print(json.dumps(plan, indent=4))

    print("\n" + "=" * 50)
    print("SQL Agent")
    print("=" * 50)

    sql_result = query_database(plan["question"])

    print(sql_result)

    print("\n" + "=" * 50)
    print("Formatter")
    print("=" * 50)

    result = formatter(
        user_question=question,
        sql_result=sql_result,
        display=plan["display"],
        chart_type=plan["chart_type"]
    )

    return result

# ======================================================
# Test
# ======================================================

if __name__ == "__main__":

    question = "Show revenue per products in June"

    result = dashboard_pipeline(question)

    print("\nFinal Result")

    print(json.dumps(result, indent=4))