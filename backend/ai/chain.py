from langgraph.prebuilt import create_react_agent
from ai.llm import llm
from ai.prompt import SYSTEM_PROMPT
from ai.tool import TOOLS

agent = create_react_agent(
    model=llm,
    tools=TOOLS,
    prompt=SYSTEM_PROMPT,
)
