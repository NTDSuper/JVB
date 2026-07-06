from dotenv import load_dotenv
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from ai.tool import TOOLS

load_dotenv()

# llm = ChatGoogleGenerativeAI(
#     model="gemini-2.5-flash",
#     temperature=0,
# ).bind_tools(TOOLS)

llm = ChatNVIDIA(
    model="deepseek-ai/deepseek-v4-flash",
    api_key="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",
    temperature=1,
    top_p=0.95,
    max_tokens=4096,
).bind_tools(TOOLS)
