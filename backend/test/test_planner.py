from langchain_nvidia_ai_endpoints import ChatNVIDIA

client = ChatNVIDIA(
    model="stepfun-ai/step-3.7-flash",
    api_key="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",
    temperature=1,
    top_p=0.95,
    max_completion_tokens=16384,
)

response = client.invoke("Hello There")
print(response.content)
