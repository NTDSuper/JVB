from typing import Any, Dict, List

from pydantic import BaseModel, Field
from langchain_core.output_parsers import PydanticOutputParser


class SQLResult(BaseModel):
    sql: str = Field(description="Generated SQL query.")

    columns: List[str] = Field(description="Returned columns.")

    rows: List[Dict[str, Any]] = Field(description="Query results.")

    row_count: int = Field(description="Number of returned rows.")


sql_parser = PydanticOutputParser(pydantic_object=SQLResult)
