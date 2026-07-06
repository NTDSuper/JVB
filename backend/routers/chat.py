import json
import logging
import re

import redis
from fastapi import APIRouter, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from jose import JWTError
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ai.chat import chat
from database import SessionLocal
from models.users_model import User
from utils.jwt_handler import decode_token
from utils.redis_client import redis_client

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/chat",
    tags=["Chat"],
)


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    answer: str


# ── Hàm xác thực JWT dùng chung ─────────────────────────────────────────────
def _authenticate_token(token: str, db: Session) -> User:
    try:
        payload = decode_token(token)
    except JWTError:
        raise ValueError("Invalid token or expired")

    if payload.get("type") != "access":
        raise ValueError("Wrong token type")

    email = payload.get("sub")
    jti = payload.get("jti")

    if not email:
        raise ValueError("Invalid token: missing subject")

    try:
        if redis_client.get(f"blacklist:{jti}"):
            raise ValueError("Invalid token: revoked")
    except redis.RedisError as e:
        logger.warning(f"Redis unavailable during WS auth: {e}")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise ValueError("User not found")
    if not user.is_active:
        raise ValueError("Invalid user: inactive")

    return user


# ── HTTP POST ────────────────────────────────────────────────────────────────
@router.post("/", response_model=ChatResponse)
async def chat_bot(req: ChatRequest):
    try:
        answer = chat(
            session_id=req.session_id,
            message=req.message,
        )

        return ChatResponse(answer=answer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


from starlette.concurrency import run_in_threadpool

# ── Connection Manager ───────────────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

manager = ConnectionManager()


# ── WebSocket (JWT qua query param) ─────────────────────────────────────────
@router.websocket("/ws/{session_id}")
async def chat_ws(
    websocket: WebSocket,
    session_id: str,
    token: str = Query(..., description="JWT access token"),
):
    # 1. Accept WebSocket handshake trước
    await manager.connect(websocket)

    # 2. Xác thực token sau khi đã accept
    db: Session = SessionLocal()
    try:
        _authenticate_token(token, db)
    except ValueError as e:
        logger.warning(f"WebSocket auth failed session={session_id}: {e}")
        await manager.send_personal_message({"type": "error", "content": str(e)}, websocket)
        await websocket.close(code=4001)
        manager.disconnect(websocket)
        return
    finally:
        db.close()

    logger.info(f"WebSocket authenticated: session={session_id}")
    await manager.send_personal_message({"type": "ready", "content": "Authentication successful"}, websocket)

    # 3. Vòng lặp nhận/gửi tin nhắn
    try:
        while True:
            raw = await websocket.receive_text()
            raw = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", raw)

            try:
                data = json.loads(raw)
                message = str(data.get("message", "")).strip()
            except json.JSONDecodeError:
                await manager.send_personal_message({"type": "error", "content": "JSON invalid"}, websocket)
                continue

            if not message:
                await manager.send_personal_message({"type": "error", "content": "Empty message"}, websocket)
                continue

            try:
                # Run synchronous chat function in a threadpool to prevent blocking the event loop
                answer = await run_in_threadpool(chat, session_id=session_id, message=message)
                await manager.send_personal_message({"type": "answer", "content": answer}, websocket)
            except Exception as e:
                logger.exception(f"AI error session={session_id}")
                await manager.send_personal_message({"type": "error", "content": str(e)}, websocket)

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: session={session_id}")
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket unexpected error session={session_id}: {e}")
        manager.disconnect(websocket)