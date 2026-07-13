from langchain_redis import RedisChatMessageHistory


import json

from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import (
    BaseMessage,
    messages_from_dict,
    messages_to_dict,
)

from utils.redis_client import redis_client  # redis.Redis(...) của bạn


class RedisChatHistory(BaseChatMessageHistory):
    def __init__(self, session_id: str, ttl: int | None = None):
        self.session_id = session_id
        self.key = f"chat_history:{session_id}"
        self.ttl = ttl

    @property
    def messages(self) -> list[BaseMessage]:
        data = redis_client.get(self.key)

        if data is None:
            return []

        return messages_from_dict(json.loads(data))

    def add_message(self, message: BaseMessage) -> None:
        messages = self.messages
        messages.append(message)

        redis_client.set(
            self.key,
            json.dumps(messages_to_dict(messages))
        )

        if self.ttl:
            redis_client.expire(self.key, self.ttl)

    def clear(self) -> None:
        redis_client.delete(self.key)

def get_session_history(session_id: str):
    return RedisChatHistory(
        session_id=session_id,
        ttl=5 * 60  # 5 phút, 
    )