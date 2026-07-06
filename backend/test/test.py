import os
import re
import json

from dotenv import load_dotenv

from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_community.utilities import SQLDatabase

load_dotenv()

# ======================================================
# CONFIG
# ======================================================

MODEL = "qwen/qwen3.5-397b-a17b"

API_KEY = "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"

# ======================================================
# DATABASE
# ======================================================

db = SQLDatabase.from_uri(
    "mysql+pymysql://root:123456@localhost:3307/mydb"
)

# ======================================================
# LLM
# ======================================================

planner_llm = ChatNVIDIA(
    model=MODEL,
    api_key=API_KEY,
    temperature=0,
)

sql_llm = ChatNVIDIA(
    model=MODEL,
    api_key=API_KEY,
    temperature=0,
)

formatter_llm = ChatNVIDIA(
    model=MODEL,
    api_key=API_KEY,
    temperature=0,
)

# ======================================================
# Planner
# ======================================================

def planner(question: str):

    prompt = f"""
You are a dashboard planner.

Return ONLY valid JSON.

Schema:

{{
    "display":"table|chart|kpi",
    "chart_type":"bar|line|pie|none",
    "question":"rewritten database question"
}}

User:

{question}
"""

    response = planner_llm.invoke(prompt)

    return json.loads(response.content)

# ======================================================
# Generate SQL
# ======================================================

def generate_sql(question: str):

    schema = db.get_table_info()

    prompt = f"""
You are a MySQL expert.

Database schema:

{schema}

Generate ONLY one MySQL SELECT statement.

Rules:

- Output SQL only.
- No markdown.
- No explanation.
- Only SELECT.
- Never INSERT UPDATE DELETE DROP ALTER.

Question:

{question}
"""

    response = sql_llm.invoke(prompt)

    sql = response.content.strip()

    sql = sql.replace("```sql", "")
    sql = sql.replace("```", "")
    sql = sql.strip()

    return sql

# ======================================================
# Validate SQL
# ======================================================

def validate_sql(sql):

    sql_upper = sql.upper()

    if not sql_upper.startswith("SELECT"):
        raise Exception("Only SELECT allowed.")

    forbidden = [
        "INSERT",
        "UPDATE",
        "DELETE",
        "DROP",
        "ALTER",
        "TRUNCATE",
        "CREATE"
    ]

    for keyword in forbidden:
        if keyword in sql_upper:
            raise Exception(f"Forbidden keyword: {keyword}")

# ======================================================
# Execute SQL
# ======================================================

def execute_sql(sql):

    return db.run(sql)

# ======================================================
# Formatter
# ======================================================

def formatter(question, sql_result, display, chart_type):

    prompt = f"""
You are an AI dashboard formatter.

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

Question:

{question}

SQL Result:

{sql_result}
"""

    response = formatter_llm.invoke(prompt)

    return json.loads(response.content)

# ======================================================
# Pipeline
# ======================================================

def dashboard(question):

    print("="*60)
    print("PLANNER")
    print("="*60)

    plan = planner(question)

    print(json.dumps(plan, indent=4))

    print("="*60)
    print("GENERATE SQL")
    print("="*60)

    sql = generate_sql(plan["question"])

    print(sql)

    validate_sql(sql)

    print("="*60)
    print("EXECUTE SQL")
    print("="*60)

    result = execute_sql(sql)

    print(result)

    print("="*60)
    print("FORMATTER")
    print("="*60)

    final = formatter(
        question,
        result,
        plan["display"],
        plan["chart_type"]
    )

    return final


if __name__ == "__main__":

    question = "Show monthly revenue"

    result = dashboard(question)

    print(json.dumps(result, indent=4))