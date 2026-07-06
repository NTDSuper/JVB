"""
SQL Agent: Execute natural language queries against the database.
"""

import logging
import os

from dotenv import load_dotenv
from langchain_community.agent_toolkits import create_sql_agent
from langchain_community.utilities import SQLDatabase

from .schemas import PlannerTask

load_dotenv()

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:123456@localhost:3307/mydb",
)


def create_agent(llm):
    """Create a singleton SQL agent."""
    print(f"Creating SQL agent with database URL: {DATABASE_URL}")
    db = SQLDatabase.from_uri(DATABASE_URL)

    agent = create_sql_agent(
        llm=llm,
        db=db,
        agent_type="tool-calling",
        verbose=False,
        agent_executor_kwargs={
            "handle_parsing_errors": True,
        },
    )
    return agent


def run_sql_agent(agent, task: PlannerTask) -> str:
    """Execute a single SQL task and return raw text output."""
    logger.info(f"SQL Agent: executing query for task: {task.question}")

    result = agent.invoke({"input": task.question})
    output = result["output"]

    logger.info(f"SQL Agent: got result of length {len(output)}")
    return output