import os

from dotenv import load_dotenv
import json

from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits import create_sql_agent

load_dotenv()

# ==========================
# Planner LLM
# ==========================
planner = ChatNVIDIA(
  model="qwen/qwen3.5-397b-a17b",
  api_key=os.getenv("NVIDIA_API_KEY"),
  temperature=0.6,
  top_p=0.95,
  max_completion_tokens=16384,
)

# ==========================
# SQL Agent
# ==========================
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

db = SQLDatabase.from_uri(
    "mysql+pymysql://root:123456@localhost:3307/mydb"
)

sql_agent = create_sql_agent(
    llm=sql_llm,
    db=db,
    verbose=True,
    agent_executor_kwargs={
        "handle_parsing_errors": True
    }
)

# ==========================
# User Question
# ==========================
question = "Show monthly revenue"

# ==========================
# Planner
# ==========================

planner_prompt = f"""
You are a dashboard planner.

Analyze the user's request.

Return ONLY JSON.

Schema:

{{
    "tool":"sql",
    "display":"table | chart | kpi",
    "chart_type":"bar | line | pie | none",
    "question":"database question"
}}

User:

{question}
"""

plan = planner.invoke(planner_prompt)

print("========== Planner ==========")
print(plan.content)

plan = json.loads(plan.content)

# ==========================
# SQL Agent
# ==========================

sql_result = sql_agent.invoke({
    "input": plan["question"]
})

print("\n========== SQL ==========")
print(sql_result["output"])

# ==========================
# Build Response
# ==========================

response = {
    "display": plan["display"],
    "chart_type": plan["chart_type"],
    "title": question,
    "data": sql_result["output"]
}

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

result = formatter(
        user_question=question,
        sql_result=sql_result,
        display=plan["display"],
        chart_type=plan["chart_type"]
    )

print(result)

print("\n========== FINAL ==========")
print(json.dumps(response, indent=4))