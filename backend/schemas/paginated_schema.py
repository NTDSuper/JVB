from pydantic import BaseModel
from typing import Any, List


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    skip: int
    limit: int
