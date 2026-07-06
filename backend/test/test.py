import os
import json
from dotenv import load_dotenv

from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits import create_sql_agent

from test_planner import planner_parser
from fomatter import formatter_parser

load_dotenv()

# ==========================
# LLM
# ==========================

llm = ChatNVIDIA(
    model="qwen/qwen3.5-397b-a17b",
    api_key="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",
    temperature=0.6,
)

# ==========================
# Database
# ==========================

db = SQLDatabase.from_uri(
    os.getenv("DATABASE_URL")
)

sql_agent = create_sql_agent(
    llm=llm,
    db=db,
    agent_type="tool-calling",
    verbose=True,
)

# ==========================
# User Question
# ==========================

question = "Show monthly revenue"

# ==========================
# Planner
# ==========================

planner_prompt = f"""
{planner_parser.get_format_instructions()}

User Question:
{question}
"""

planner_response = llm.invoke(planner_prompt)

tasks = planner_parser.parse(
    planner_response.content
).root

dashboard_results = []

# ==========================
# Execute Tasks
# ==========================

for task in tasks:

    print("=" * 50)
    print(task)

    # ----------------------
    # SQL Agent
    # ----------------------

    sql_result = sql_agent.invoke(
        {
            "input": task.question
        }
    )

    print(sql_result)

    # output của SQL Agent
    sql_output = sql_result["output"]
    
    # ----------------------
    # Formatter
    # ----------------------

    formatter_prompt = f"""
{formatter_parser.get_format_instructions()}

Display:
{task.display}

Chart Type:
{task.chart_type}

Database Result:
{sql_output}
"""

    formatter_response = llm.invoke(formatter_prompt)

    dashboard = formatter_parser.parse(
        formatter_response.content
    )

    dashboard_results.append(
        dashboard.model_dump()
    )

# ==========================
# Final Result
# ==========================

print("\n========== DASHBOARD ==========\n")

print(
    json.dumps(
        dashboard_results,
        indent=2,
        ensure_ascii=False
    )
)