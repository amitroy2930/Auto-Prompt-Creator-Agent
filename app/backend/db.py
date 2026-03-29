import os
import uuid
from contextlib import contextmanager
from typing import Any, Dict, List, Optional

import psycopg
from psycopg.rows import dict_row


DEFAULT_DATABASE_URL = "postgresql://autoprompt:autoprompt@localhost:5432/autoprompt"


def get_database_url() -> str:
    return os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)


@contextmanager
def get_connection():
    conn = psycopg.connect(get_database_url(), row_factory=dict_row)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    id UUID PRIMARY KEY,
                    title TEXT NOT NULL DEFAULT 'New chat',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id BIGSERIAL PRIMARY KEY,
                    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
                    thread_id TEXT NOT NULL,
                    model TEXT,
                    role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
                    content TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
                ON chat_messages (session_id, created_at)
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created
                ON chat_messages (thread_id, created_at)
                """
            )


def create_chat_session(title: Optional[str] = None, chat_id: Optional[str] = None) -> Dict[str, Any]:
    session_id = chat_id or str(uuid.uuid4())
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO chat_sessions (id, title)
                VALUES (%s, %s)
                ON CONFLICT (id) DO UPDATE
                SET title = COALESCE(chat_sessions.title, EXCLUDED.title)
                RETURNING id, title, created_at, updated_at
                """,
                (session_id, title or "New chat"),
            )
            return cur.fetchone()


def ensure_chat_session(chat_id: str) -> Dict[str, Any]:
    return create_chat_session(chat_id=chat_id)


def save_chat_message(
    *,
    chat_id: str,
    thread_id: str,
    role: str,
    content: str,
    model: Optional[str] = None,
) -> Dict[str, Any]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO chat_sessions (id, title)
                VALUES (%s, 'New chat')
                ON CONFLICT (id) DO NOTHING
                """,
                (chat_id,),
            )

            cur.execute(
                """
                INSERT INTO chat_messages (session_id, thread_id, model, role, content)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, session_id, thread_id, model, role, content, created_at
                """,
                (chat_id, thread_id, model, role, content),
            )
            row = cur.fetchone()

            cur.execute(
                """
                UPDATE chat_sessions
                SET updated_at = NOW()
                WHERE id = %s
                """,
                (chat_id,),
            )

            if role == "user":
                normalized = " ".join(content.split())
                derived_title = (normalized[:77] + "...") if len(normalized) > 80 else normalized
                if derived_title:
                    cur.execute(
                        """
                        UPDATE chat_sessions
                        SET title = %s
                        WHERE id = %s AND title = 'New chat'
                        """,
                        (derived_title, chat_id),
                    )

            return row


def list_chat_sessions() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    s.id,
                    s.title,
                    s.created_at,
                    s.updated_at,
                    COALESCE(msg_count.message_count, 0) AS message_count,
                    last_msg.preview
                FROM chat_sessions s
                LEFT JOIN LATERAL (
                    SELECT COUNT(*)::INT AS message_count
                    FROM chat_messages m
                    WHERE m.session_id = s.id
                ) AS msg_count ON TRUE
                LEFT JOIN LATERAL (
                    SELECT m.content AS preview
                    FROM chat_messages m
                    WHERE m.session_id = s.id AND m.role = 'user'
                    ORDER BY m.created_at DESC, m.id DESC
                    LIMIT 1
                ) AS last_msg ON TRUE
                ORDER BY s.updated_at DESC, s.created_at DESC
                """
            )
            return cur.fetchall()


def get_chat_session(chat_id: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, created_at, updated_at
                FROM chat_sessions
                WHERE id = %s
                """,
                (chat_id,),
            )
            session = cur.fetchone()
            if not session:
                return None

            cur.execute(
                """
                SELECT id, session_id, thread_id, model, role, content, created_at
                FROM chat_messages
                WHERE session_id = %s
                ORDER BY created_at ASC, id ASC
                """,
                (chat_id,),
            )
            messages = cur.fetchall()

            return {"chat": session, "messages": messages}


def delete_chat_session(chat_id: str) -> bool:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM chat_sessions WHERE id = %s RETURNING id", (chat_id,))
            deleted = cur.fetchone()
            return bool(deleted)


def list_thread_messages(chat_id: str, thread_id: str) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, session_id, thread_id, model, role, content, created_at
                FROM chat_messages
                WHERE session_id = %s AND thread_id = %s
                ORDER BY created_at ASC, id ASC
                """,
                (chat_id, thread_id),
            )
            return cur.fetchall()
