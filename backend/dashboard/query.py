import json

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

from .schemas import QueryAnalysis


parser = PydanticOutputParser(
    pydantic_object=QueryAnalysis
)


query_analyzer_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """
You are a dashboard assistant that helps users refine their questions.

Given a user's request, analyze it and:

1. Determine if the question is clear enough to generate a dashboard (`clear: true/false`).
2. Explain your reasoning (`reason`).
3. ALWAYS suggest 2-5 useful options that would make the dashboard more insightful, even if the question is already clear.

Each option should have:
- `id`: a unique short identifier (e.g. "time_period", "dimension", "filter", "comparison", "metric")
- `label`: a short display text (e.g. "Filter by date range")
- `context`: a brief explanation of what this adds
- `suggestion`: the exact text snippet to append to the original question (e.g. " for the last 6 months")

The `suggestion` field is critical: it will be appended to the user's original question when they select the option.
So make sure each suggestion is grammatically correct when appended.

Examples:

User: "Show revenue"
→ Options:
  - id: "time_period", label: "By time period", context: "View revenue trend over months or years", suggestion: " by month for the last 12 months"
  - id: "dimension", label: "By category", context: "Break down revenue by product category", suggestion: " broken down by product category"
  - id: "comparison", label: "Compare periods", context: "Compare revenue between current and previous period", suggestion: " and compare with the previous period"

User: "Show monthly revenue for the last 6 months"
→ Options:
  - id: "dimension", label: "By category", context: "Break down revenue by product category", suggestion: " broken down by product category"
  - id: "filter", label: "Filter by region", context: "See revenue for specific regions only", suggestion: " for the US region only"
  - id: "metric", label: "Add profit", context: "Include profit alongside revenue", suggestion: " and profit"

User: "Show top 5 best-selling products"
→ Options:
  - id: "time_period", label: "By time period", context: "See best-sellers over a specific time range", suggestion: " in the last 30 days"
  - id: "dimension", label: "By category", context: "Filter best-sellers by product category", suggestion: " in the Electronics category"
  - id: "metric", label: "Add revenue", context: "Include revenue numbers for each product", suggestion: " with their total revenue"

Return JSON only.

{format_instructions}
"""
    ),
    (
        "human",
        "{question}"
    ),
])


def analyze_dashboard_query(
    llm,
    question: str
) -> QueryAnalysis:

    messages = query_analyzer_prompt.format_messages(
        question=question,
        format_instructions=
            parser.get_format_instructions()
    )

    response = llm.invoke(messages)

    return parser.parse(
        response.content
    )