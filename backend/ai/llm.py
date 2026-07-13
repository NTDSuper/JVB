import os

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from ai.tool import TOOLS

load_dotenv()

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0,
).bind_tools(TOOLS)

# API_KEY = os.getenv("NVIDIA_API_KEY")
# MODEL = "deepseek-ai/deepseek-v4-pro"

# llm = ChatNVIDIA(
#     model=MODEL,
#     api_key=API_KEY,
#     temperature=1,
#     top_p=0.95,
#     max_tokens=4096,
# ).bind_tools(TOOLS)
