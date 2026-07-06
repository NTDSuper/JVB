from langchain_core.chat_history import InMemoryChatMessageHistory

_store = {}

def get_session_history(session_id: str):
    if session_id not in _store:
        _store[session_id] = InMemoryChatMessageHistory()

    return _store[session_id]