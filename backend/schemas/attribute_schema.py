from pydantic import BaseModel
from typing import Optional


class AttributeCreate(BaseModel):
    category_id: int
    name: str
    data_type: str  # e.g. "text", "number", "select", "date"
    required: bool = False


class AttributeUpdate(BaseModel):
    name: Optional[str] = None
    data_type: Optional[str] = None
    required: Optional[bool] = None


class AttributeResponse(BaseModel):
    id: int
    category_id: Optional[int]
    name: str
    data_type: str
    required: bool

    class Config:
        from_attributes = True