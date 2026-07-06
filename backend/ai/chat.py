from langchain_core.messages import AIMessage, HumanMessage

from ai.chain import agent
from ai.memory import get_session_history


def chat(session_id: str, message: str) -> str:
    # Lấy lịch sử hội thoại từ memory
    history = get_session_history(session_id)

    # Tạo danh sách messages: lịch sử cũ + message mới
    messages = list(history.messages) + [HumanMessage(content=message)]

    # Invoke agent (create_react_agent trả về {"messages": [...]})
    result = agent.invoke({"messages": messages})

    # Lấy tin nhắn cuối cùng từ AI
    output_messages = result["messages"]
    ai_message = None
    for msg in reversed(output_messages):
        if isinstance(msg, AIMessage):
            ai_message = msg
            break

    if ai_message is None:
        return "Xin lỗi, tôi không thể trả lời lúc này."

    answer = ai_message.content

    # Cập nhật memory với message mới + phản hồi của AI
    history.add_user_message(message)
    history.add_ai_message(answer)

    return answer