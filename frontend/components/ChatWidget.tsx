"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@/lib/useChat";
import "./ChatWidget.css";

const SESSION_KEY = "chat_session_id";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return crypto.randomUUID();
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

const STATUS_LABELS: Record<string, string> = {
  open: "Connected",
  connecting: "Connecting...",
  closed: "Disconnected",
  error: "Connection Error",
};

const STATUS_DOT: Record<string, string> = {
  open: "dot-green",
  connecting: "dot-yellow dot-pulse",
  closed: "dot-red",
  error: "dot-red",
};

export default function ChatWidget() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const sessionId = useRef(getOrCreateSessionId()).current;

  const { messages, status, isSending, sendMessage, clearMessages } =
    useChat(sessionId);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  console.log("ChatWidget render", { messages, status, isSending });

  // Auto-scroll khi có tin nhắn mới
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // Focus textarea khi mở
  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 120);
  }, [open]);

  // Native DOM click handler for product links (works with dangerouslySetInnerHTML)
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      if (link && link.getAttribute("href")?.startsWith("/products/")) {
        e.preventDefault();
        setOpen(false);
        const href = link.getAttribute("href")!;
        // Use setTimeout to avoid React batching issues
        setTimeout(() => router.push(href), 0);
      }
    };

    el.addEventListener("click", handleClick);
    return () => el.removeEventListener("click", handleClick);
  }, [router]);

  // Chuyển đổi content an toàn về string, tránh hiển thị "[object Object]"
  const formatContent = (content: unknown): string => {
    if (typeof content === "string") return content;
    if (content === null || content === undefined) return "";
    if (typeof content === "object") {
      const obj = content as Record<string, unknown>;
      if (obj.text && typeof obj.text === "string") return obj.text;
      if (obj.content && typeof obj.content === "string") return obj.content;
      if (Array.isArray(content)) {
        return content.map((item) => formatContent(item)).join("\n");
      }
      try {
        return JSON.stringify(content);
      } catch {
        return String(content);
      }
    }
    return String(content);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        suppressHydrationWarning
        id="chat-widget-toggle"
        className={`chat-fab${open ? " chat-fab--active" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open AI chat"}
        title="Chat with AI"
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <circle cx="9" cy="10" r="1" fill="currentColor" />
            <circle cx="12" cy="10" r="1" fill="currentColor" />
            <circle cx="15" cy="10" r="1" fill="currentColor" />
          </svg>
        )}
        {!open && messages.filter((m) => m.role === "ai").length > 0 && (
          <span className="chat-fab-badge" aria-hidden="true" />
        )}
      </button>

      {/* Chat panel */}
      <div
        id="chat-widget-panel"
        className={`chat-panel${open ? " chat-panel--open" : ""}`}
        role="dialog"
        aria-label="Chat AI"
        aria-modal="false"
      >
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a5 5 0 0 1 5 5c0 2.76-2.24 5-5 5S7 9.76 7 7a5 5 0 0 1 5-5z" />
                <path d="M3 21a9 9 0 0 1 18 0" />
              </svg>
            </div>
            <div>
              <p className="chat-header-name">SuperMart AI</p>
              <p className="chat-header-status">
                <span className={`dot ${STATUS_DOT[status] ?? "dot-red"}`} />
                {STATUS_LABELS[status] ?? "Không rõ"}
              </p>
            </div>
          </div>
          <button
            suppressHydrationWarning
            className="chat-header-btn"
            onClick={clearMessages}
            title="Clear history"
            aria-label="Clear chat history"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="chat-messages" id="chat-messages-list" ref={messagesRef}>
          {messages.length === 0 && (
            <div className="chat-empty">
              <div className="chat-empty-icon">🛒</div>
              <p>Hello! I am the AI assistant for SuperMart.</p>
              <p>Ask me about products, prices, or compare items!</p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-msg chat-msg--${msg.role}`}
            >
              {msg.role === "ai" && (
                <div className="chat-msg-avatar" aria-hidden="true">AI</div>
              )}
              <div className="chat-msg-bubble">
                {msg.role === "ai" ? (
                  <span dangerouslySetInnerHTML={{
                    __html: formatContent(msg.content)
                      .split("\n")
                      .map(line => line.trim() ? line : "<br>")
                      .join("<br>")
                  }} />
                ) : (
                  formatContent(msg.content).split("\n").map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < formatContent(msg.content).split("\n").length - 1 && <br />}
                    </span>
                  ))
                )}
                <span className="chat-msg-time">
                  {msg.timestamp.toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isSending && (
            <div className="chat-msg chat-msg--ai">
              <div className="chat-msg-avatar" aria-hidden="true">AI</div>
              <div className="chat-msg-bubble chat-typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="chat-input-area">
          <textarea
            ref={textareaRef}
            id="chat-input"
            className="chat-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter message... (Press Enter to send)"
            rows={1}
            disabled={isSending || status === "connecting"}
            aria-label="Enter message"
          />
          <button
            suppressHydrationWarning
            id="chat-send-btn"
            className="chat-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || isSending || status === "connecting"}
            aria-label="Send message"
            title="Send (Enter)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}