"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getToken } from "@/lib/auth";
import api from "./api";

export interface ChatMessage {
  id: string;
  role: "user" | "ai" | "error";
  content: string;
  timestamp: Date;
}

type WsStatus = "connecting" | "open" | "closed" | "error";

export function useChat(sessionId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<WsStatus>("closed");
  const [isSending, setIsSending] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const isRefreshingRef = useRef(false);
  const pendingMessageRef = useRef<string | null>(null);
  const apiBase =
    ("http://localhost:8000").replace(
      /^http/,
      "ws"
    );

  const buildUrl = useCallback(() => {
    const token = getToken();
    const base = `${apiBase}/api/chat/ws/${sessionId}`;
    return token ? `${base}?token=${encodeURIComponent(token)}` : null;
  }, [apiBase, sessionId]);

  const addMessage = useCallback(
    (msg: Omit<ChatMessage, "id" | "timestamp">) => {
      setMessages((prev) => [
        ...prev,
        { ...msg, id: crypto.randomUUID(), timestamp: new Date() },
      ]);
    },
    []
  );

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    )
      return;

    const url = buildUrl();
    if (!url) {
      // Chưa đăng nhập – không kết nối
      setStatus("closed");
      return;
    }

    setStatus("connecting");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setStatus("open");
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data as string) as {
          type: string;
          content: string;
        };

        if (data.type === "ready") {
          // Backend is authenticated and ready, send any pending message
          if (pendingMessageRef.current) {
            ws.send(JSON.stringify({ message: pendingMessageRef.current }));
            pendingMessageRef.current = null;
          }
          return;
        }

        setIsSending(false);
        if (data.type === "answer") {
          addMessage({ role: "ai", content: data.content });
        } else {
          // Only show error if it's not a background auth error
          if (data.content !== "Invalid token or expired") {
            addMessage({ role: "error", content: data.content });
          }
        }
      } catch {
        setIsSending(false);
      }
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      setStatus("error");
      setIsSending(false);
    };

    ws.onclose = (event) => {
      if (!mountedRef.current) return;
      setStatus("closed");
      setIsSending(false);

      // Code 4001 = auth failed – gọi API để trigger refresh token, sau đó reconnect
      if (event.code === 4001) {
        if (!isRefreshingRef.current) {
          isRefreshingRef.current = true;

          // Gọi api.get để interceptor của Axios tự động refresh token
          api
            .get("/users/me")
            .then(() => {
              isRefreshingRef.current = false;
              if (mountedRef.current) {
                connect(); // Kết nối lại với token mới
              }
            })
            .catch(() => {
              isRefreshingRef.current = false;
              setIsSending(false);
              pendingMessageRef.current = null;
              addMessage({
                role: "error",
                content: "Fail to refresh token. Please login again.",
              });
            });
        }
        return;
      }

      // Tự reconnect sau 3 giây cho các lỗi khác
      reconnectTimer.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, 3000);
    };
  }, [buildUrl, addMessage]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback(
    (message: string) => {
      const trimmed = message.trim();
      if (!trimmed || isSending) return;

      addMessage({ role: "user", content: trimmed });

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ message: trimmed }));
        setIsSending(true);
      } else {
        // Save message to send after reconnecting
        pendingMessageRef.current = trimmed;
        setIsSending(true);
        connect();
      }
    },
    [isSending, addMessage, connect]
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, status, isSending, sendMessage, clearMessages };
}
