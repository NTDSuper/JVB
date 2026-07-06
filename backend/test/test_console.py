import os
import json
from dotenv import load_dotenv

from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits import create_sql_agent

load_dotenv()

# ======================================================
# Config
# ======================================================

API_KEY = "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"

MODEL = "qwen/qwen3.5-397b-a17b"

# ======================================================
# LLMs
# ======================================================

planner_llm = ChatNVIDIA(
  model="deepseek-ai/deepseek-v4-pro",
  api_key="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",
  temperature=1,
  top_p=0.95,
  max_tokens=16384,
)

sql_llm = ChatNVIDIA(
  model="deepseek-ai/deepseek-v4-pro",
  api_key="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",
  temperature=1,
  top_p=0.95,
  max_tokens=16384,
)

formatter_llm = ChatNVIDIA(
  model="deepseek-ai/deepseek-v4-pro",
  api_key="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",
  temperature=1,
  top_p=0.95,
  max_tokens=16384,

)

# ======================================================
# Database
# ======================================================

db = SQLDatabase.from_uri(
    "mysql+pymysql://root:123456@localhost:3307/mydb"
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

{{
    "tool":"sql",
    "display":"table|chart|kpi",
    "chart_type":"bar|line|pie|none",
    "question":"database query"
}}

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

{{
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
}}

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

    question = "Show trendy products in June"

    result = dashboard_pipeline(question)

    print("\nFinal Result")

    print(json.dumps(result, indent=4))