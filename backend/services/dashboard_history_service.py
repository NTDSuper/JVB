"""
Dashboard History Service — Tracks AI dashboard query progress in Redis,
persists completed results to MongoDB, and provides history retrieval.

Flow:
  1. When SSE streaming starts, create a Redis session with task metadata.
  2. After each task completes, update Redis with the partial widget.
  3. After ALL tasks complete, save the full result to MongoDB and clear Redis.
  4. On page reload, check Redis first for in-progress session.
  5. Historical queries are fetched from MongoDB.
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from utils.mongodb import mongo_db
from utils.redis_client import redis_client

logger = logging.getLogger(__name__)

# ── Redis key patterns ─────────────────────────────────────────────────────────

REDIS_SESSION_PREFIX = "dashboard:session:"
REDIS_SESSION_TTL = 3600  # 1 hour — clean up stale sessions

# ── MongoDB collection ─────────────────────────────────────────────────────────

DASHBOARD_HISTORY_COLLECTION = "dashboard_history"


# ── Session Management ────────────────────────────────────────────────────────


def create_session(
    user_id: int,
    question: str,
    total_tasks: int,
    tasks: List[Dict[str, Any]],
) -> str:
    """
    Create a new dashboard session in Redis.
    Before creating, delete any existing active sessions for this user
    to avoid duplicates on reload.

    Returns the session_id string.
    """
    # ── Xoá session cũ của user này để tránh duplicate khi F5 nhiều lần ──
    try:
        pattern = REDIS_SESSION_PREFIX + "*"
        cursor = 0
        deleted_count = 0
        while True:
            cursor, keys = redis_client.scan(cursor=cursor, match=pattern, count=50)
            for key in keys:
                raw = redis_client.hgetall(key)
                if not raw:
                    continue
                uid = int(raw.get("user_id", 0))
                completed = raw.get("completed", "false") == "true"
                if uid == user_id and not completed:
                    redis_client.delete(key)
                    deleted_count += 1
            if cursor == 0:
                break
        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} old session(s) for user {user_id}")
    except Exception as e:
        logger.warning(f"Failed to cleanup old sessions: {e}")

    session_id = str(uuid.uuid4())
    session_key = REDIS_SESSION_PREFIX + session_id

    session_data = {
        "session_id": session_id,
        "user_id": user_id,
        "question": question,
        "total_tasks": total_tasks,
        "tasks": json.dumps(tasks, ensure_ascii=False),  # task metadata list
        "completed_tasks": "[]",  # list of widget dicts at matching indices
        "errors": "[]",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed": "false",
    }

    redis_client.hset(session_key, mapping=session_data)
    redis_client.expire(session_key, REDIS_SESSION_TTL)

    logger.info(
        f"Dashboard session created: {session_id} (user={user_id}, tasks={total_tasks})"
    )
    return session_id


def update_task_progress(
    session_id: str,
    task_index: int,
    widget: Optional[Dict[str, Any]] = None,
    is_error: bool = False,
):
    """
    Update Redis with the result of a completed task.
    Appends the widget (or error) to the appropriate list at the matching index.
    """
    session_key = REDIS_SESSION_PREFIX + session_id

    if not redis_client.exists(session_key):
        logger.warning(f"Session {session_id} not found in Redis (may have expired)")
        return

    # Store widget at index in completed_tasks JSON array
    completed_raw = redis_client.hget(session_key, "completed_tasks") or "[]"
    completed: list = json.loads(completed_raw)

    # Ensure the array is large enough
    while len(completed) <= task_index:
        completed.append(None)

    if is_error:
        completed[task_index] = {"error": True, **(widget or {})}
    else:
        completed[task_index] = widget

    redis_client.hset(
        session_key, "completed_tasks", json.dumps(completed, ensure_ascii=False)
    )

    # Increase TTL on activity
    redis_client.expire(session_key, REDIS_SESSION_TTL)


def finalize_session(
    session_id: str,
    user_id: int,
    question: str,
    widgets: List[Dict[str, Any]],
    tasks: Optional[List[Dict[str, Any]]] = None,
) -> Optional[str]:
    """
    Save the full result to MongoDB, then delete the Redis session.

    Stores the original question, planner tasks, and all generated widgets.
    Redis session is removed after successful MongoDB save to clean up resources.

    Returns the MongoDB document ID if saved successfully, None otherwise.
    """
    session_key = REDIS_SESSION_PREFIX + session_id

    # Save to MongoDB first
    doc_id = None
    try:
        if mongo_db is None:
            logger.warning("MongoDB not available — cannot persist dashboard history")
            # Still delete Redis even if MongoDB is not available
            redis_client.delete(session_key)
            return None

        collection = mongo_db[DASHBOARD_HISTORY_COLLECTION]

        document = {
            "session_id": session_id,
            "user_id": user_id,
            "question": question,
            "tasks": tasks or [],  # ← Planner: danh sách task metadata
            "widgets": widgets,  # ← Kết quả widget hoàn chỉnh
            "widget_count": len(widgets),
            "task_count": len(tasks) if tasks else 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        result = collection.insert_one(document)
        doc_id = str(result.inserted_id)

        logger.info(
            f"Dashboard session finalized → MongoDB: {doc_id} (session={session_id})"
        )

    except Exception as e:
        logger.exception(f"Failed to save dashboard history to MongoDB: {e}")
        # Still delete Redis even on failure to avoid stale sessions
        redis_client.delete(session_key)
        return None

    # ── Xoá Redis session sau khi đã lưu thành công vào MongoDB ─────────────
    redis_client.delete(session_key)
    logger.info(f"Redis session deleted: {session_id}")

    return doc_id


def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve a dashboard session from Redis (in-progress or recently completed).

    Returns the session data dict, or None if not found.
    """
    session_key = REDIS_SESSION_PREFIX + session_id

    if not redis_client.exists(session_key):
        return None

    raw = redis_client.hgetall(session_key)
    if not raw:
        return None

    # Parse JSON fields
    session = dict(raw)
    session["tasks"] = json.loads(session.get("tasks", "[]"))
    session["completed_tasks"] = json.loads(session.get("completed_tasks", "[]"))
    session["errors"] = json.loads(session.get("errors", "[]"))
    session["completed"] = session.get("completed", "false") == "true"
    session["total_tasks"] = int(session.get("total_tasks", 0))
    session["user_id"] = int(session.get("user_id", 0))

    return session


def get_active_session_for_user(user_id: int) -> Optional[Dict[str, Any]]:
    """
    Find the most recent active (non-completed) dashboard session for a user.

    Used on page reload to resume an in-progress streaming session.
    """
    pattern = REDIS_SESSION_PREFIX + "*"
    cursor = 0
    active_session = None
    latest_created = ""

    while True:
        cursor, keys = redis_client.scan(cursor=cursor, match=pattern, count=50)
        for key in keys:
            raw = redis_client.hgetall(key)
            if not raw:
                continue
            uid = int(raw.get("user_id", 0))
            completed = raw.get("completed", "false") == "true"
            created = raw.get("created_at", "")

            if uid == user_id and not completed and created > latest_created:
                # Parse into dict
                session = dict(raw)
                session["tasks"] = json.loads(session.get("tasks", "[]"))
                session["completed_tasks"] = json.loads(
                    session.get("completed_tasks", "[]")
                )
                session["errors"] = json.loads(session.get("errors", "[]"))
                session["completed"] = False
                session["total_tasks"] = int(session.get("total_tasks", 0))
                session["user_id"] = int(session.get("user_id", 0))
                session["session_id"] = key.replace(REDIS_SESSION_PREFIX, "")

                active_session = session
                latest_created = created

        if cursor == 0:
            break

    return active_session


def delete_all_sessions_for_user(user_id: int) -> int:
    """
    Deletes all existing dashboard sessions in Redis for a given user.
    Ensures that a user can only have at most 1 active session at a time.
    """
    pattern = REDIS_SESSION_PREFIX + "*"
    cursor = 0
    deleted_count = 0

    while True:
        cursor, keys = redis_client.scan(cursor=cursor, match=pattern, count=50)
        for key in keys:
            raw = redis_client.hgetall(key)
            if not raw:
                continue
            uid = int(raw.get("user_id", 0))
            if uid == user_id:
                redis_client.delete(key)
                deleted_count += 1
                logger.info(f"Deleted stale session for user {user_id}: {key}")

        if cursor == 0:
            break

    return deleted_count


def delete_session(session_id: str) -> bool:
    """
    Xoá một Redis session (dùng khi reload — xoá session cũ trước khi resume).
    """
    session_key = REDIS_SESSION_PREFIX + session_id
    try:
        result = redis_client.delete(session_key)
        if result:
            logger.info(f"Redis session deleted: {session_id}")
        else:
            logger.warning(f"Redis session not found for deletion: {session_id}")
        return result > 0
    except Exception as e:
        logger.warning(f"Failed to delete Redis session {session_id}: {e}")
        return False


# ── History (MongoDB) ────────────────────────────────────────────────────────


def get_history_for_user(
    user_id: int,
    skip: int = 0,
    limit: int = 20,
) -> List[Dict[str, Any]]:
    """
    Retrieve dashboard query history for a user from MongoDB, newest first.
    """
    if mongo_db is None:
        logger.warning("MongoDB not available — cannot fetch dashboard history")
        return []

    try:
        collection = mongo_db[DASHBOARD_HISTORY_COLLECTION]
        cursor = (
            collection.find({"user_id": user_id})
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )

        results = []
        for doc in cursor:
            doc["_id"] = str(doc["_id"])
            results.append(doc)

        return results

    except Exception as e:
        logger.exception(f"Failed to fetch dashboard history: {e}")
        return []


def get_history_by_id(doc_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve a single dashboard history document by its MongoDB _id.
    """
    if mongo_db is None:
        return None

    try:
        from bson.objectid import ObjectId

        collection = mongo_db[DASHBOARD_HISTORY_COLLECTION]
        doc = collection.find_one({"_id": ObjectId(doc_id)})
        if doc:
            doc["_id"] = str(doc["_id"])
            return doc
        return None

    except Exception as e:
        logger.exception(f"Failed to fetch dashboard history by id: {e}")
        return None


def delete_history(doc_id: str, user_id: int) -> bool:
    """
    Delete a dashboard history document by its MongoDB _id (owner check).
    """
    if mongo_db is None:
        return False

    try:
        from bson.objectid import ObjectId

        collection = mongo_db[DASHBOARD_HISTORY_COLLECTION]
        result = collection.delete_one({"_id": ObjectId(doc_id), "user_id": user_id})
        return result.deleted_count > 0

    except Exception as e:
        logger.exception(f"Failed to delete dashboard history: {e}")
        return False
