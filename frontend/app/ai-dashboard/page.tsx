"use client";

import { useState, useRef, useCallback, useEffect } from "react";

import api from "@/lib/api";
import { withProtection } from "@/components/ProtectedRouter";
import AiDashboardWidget, { type AiWidgetData } from "./components/AiDashboardWidget";
import HistoryPanel from "./components/HistoryPanel";

const SUGGESTED_QUESTIONS = [
  "Show monthly revenue for the last 6 months",
  "Show total orders by status",
  "Show top 5 best-selling products",
  "Show revenue by category",
  "Show daily order count for the last 30 days",
];

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

interface QueryOption {
  id: string;
  label: string;
  context: string;
  suggestion: string;
}

interface QueryAnalysisData {
  clear: boolean;
  reason: string;
  enhanced_question: string;
  options: QueryOption[];
  chatbot_response: string;
}

interface TaskInfo {
  question: string;
  display: string;
  chart_type: string;
}

interface SsePlanEvent {
  type: "plan";
  total: number;
  tasks?: TaskInfo[];
  session_id?: string;
}

interface SseTaskEvent {
  type: "task";
  index: number;
  total: number;
  question: string;
  display: string;
  chart_type: string;
}

interface SseWidgetEvent {
  type: "widget" | "error";
  index: number;
  total: number;
  widget: AiWidgetData;
  session_id?: string;
}

interface SseDoneEvent {
  type: "done";
  session_id?: string;
  history_id?: string;
}

type SseEvent = SsePlanEvent | SseTaskEvent | SseWidgetEvent | SseDoneEvent;

interface HistoryItem {
  _id: string;
  session_id: string;
  user_id: number;
  question: string;
  tasks: TaskInfo[];
  widgets: AiWidgetData[];
  widget_count: number;
  task_count: number;
  created_at: string;
}

function AiDashboardPage() {
  const [question, setQuestion] = useState("");
  const [widgets, setWidgets] = useState<AiWidgetData[]>([]);
  const [totalWidgets, setTotalWidgets] = useState<number | null>(null);
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [wasCancelled, setWasCancelled] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Session tracking (for reload recovery)
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Guard: chỉ cho phép 1 SSE connection tại 1 thời điểm
  const streamingRef = useRef(false);
  // Flag: user đã bấm Cancel → không xử lý thêm event từ stream buffer
  const cancelledRef = useRef(false);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Refs to track latest values for saving history on stream completion
  const widgetsRef = useRef<AiWidgetData[]>([]);
  const tasksRef = useRef<TaskInfo[]>([]);
  const questionRef = useRef("");

  // Analysis state
  const [analysis, setAnalysis] = useState<QueryAnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [enhancedQuestion, setEnhancedQuestion] = useState("");

  // Tab state
  const [activeTab, setActiveTab] = useState<"ask" | "history">("ask");
  const [viewingHistoryItem, setViewingHistoryItem] = useState<HistoryItem | null>(null);
  const [showHistoryList, setShowHistoryList] = useState(true);
  const [savedToHistory, setSavedToHistory] = useState(false);

  const skeletonCount = totalWidgets ? Math.min(totalWidgets - widgets.length, totalWidgets) : 0;

  // ── Hàm cancel dành riêng cho nút Cancel (user bấm) ──
  const handleStreamCancel = useCallback(() => {
    cancelledRef.current = true;
    setWasCancelled(true);
    // Lưu session_id trước khi abort để gọi API cancel
    const sid = sessionId;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
    streamingRef.current = false;
    // Gọi API xoá Redis session để backend không tiếp tục xử lý
    if (sid) {
      api.post(`/dashboard/session/${sid}/cancel`).catch((err) => {
        console.error("Failed to cancel session on backend:", err);
      });
    }
  }, [sessionId]);

  // ── Hàm cancel dùng nội bộ: cancel stream cũ NHƯNG không reset streamingRef/cancelledRef ──
  const cancelInternal = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // ── On mount: check for active Redis session and auto-resume ──────────
  useEffect(() => {
    checkActiveSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkActiveSession = async () => {
    setCheckingSession(true);
    try {
      const res = await api.get("/dashboard/session/active");
      if (res.data?.success && res.data?.data) {
        const session = res.data.data;
        const completedWidgets: AiWidgetData[] = session.completed_tasks?.filter(Boolean) || [];

        setSessionId(session.session_id);
        setWidgets(completedWidgets);
        setTasks(session.tasks || []);
        setTotalWidgets(session.total_tasks);
        setQuestion(session.question || "");

        // If the session was already completed and finalized during the active check:
        if (session.completed && session.history_id) {
          setHistoryId(session.history_id);
          setActiveSession(null);
          return;
        }

        // Auto-resume if there are still incomplete tasks — only if no active stream
        if (completedWidgets.length < session.total_tasks && !streamingRef.current) {
          setTimeout(() => {
            autoResumeSession(session);
          }, 100);
        }
      } else {
        // No active session in backend — restore from sessionStorage if available
        const saved = sessionStorage.getItem("dashboard_state");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.widgets && parsed.widgets.length > 0) {
              setWidgets(parsed.widgets);
              setTasks(parsed.tasks || []);
              setTotalWidgets(parsed.totalWidgets);
              setQuestion(parsed.question || "");
              setHistoryId(parsed.historyId || null);
            }
          } catch (e) {
            console.error("Failed to parse dashboard state from sessionStorage", e);
          }
        }
      }
    } catch {
      // On error, also try to restore from sessionStorage
      const saved = sessionStorage.getItem("dashboard_state");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.widgets && parsed.widgets.length > 0) {
            setWidgets(parsed.widgets);
            setTasks(parsed.tasks || []);
            setTotalWidgets(parsed.totalWidgets);
            setQuestion(parsed.question || "");
            setHistoryId(parsed.historyId || null);
          }
        } catch (e) { }
      }
    } finally {
      setCheckingSession(false);
    }
  };

  // Save dashboard state to sessionStorage whenever it changes, so it survives reloads
  useEffect(() => {
    if (widgets.length > 0) {
      sessionStorage.setItem("dashboard_state", JSON.stringify({
        widgets,
        tasks,
        totalWidgets,
        question,
        historyId,
      }));
    } else {
      sessionStorage.removeItem("dashboard_state");
    }
  }, [widgets, tasks, totalWidgets, question, historyId]);

  // Keep refs in sync for history saving
  useEffect(() => { widgetsRef.current = widgets; }, [widgets]);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { questionRef.current = question; }, [question]);

  // Save completed widgets to localStorage history
  const saveToLocalHistory = useCallback(() => {
    const finalWidgets = widgetsRef.current.filter(Boolean);
    if (finalWidgets.length === 0) return;
    const item: HistoryItem = {
      _id: `local_${Date.now()}`,
      session_id: sessionId || "",
      user_id: 0,
      question: questionRef.current,
      tasks: tasksRef.current,
      widgets: finalWidgets,
      widget_count: finalWidgets.length,
      task_count: tasksRef.current.length,
      created_at: new Date().toISOString(),
    };
    try {
      const raw = localStorage.getItem("ai_dashboard_history");
      const existing = raw ? JSON.parse(raw) : [];
      const next = [item, ...existing].slice(0, 50);
      localStorage.setItem("ai_dashboard_history", JSON.stringify(next));
      setSavedToHistory(true);
    } catch (e) {
      console.error("Failed to save history to localStorage", e);
    }
  }, [sessionId]);

  /**
   * Shared SSE stream reader — handles plan/task/widget/error/done events.
   * @param response  The axios streaming response
   * @param startIndex  Number of widgets already completed before this stream
   */
  const processStream = async (
    response: any,
    startIndex: number = 0,
  ) => {
    const stream: ReadableStream<Uint8Array> = response.data;
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      // Nếu user đã cancel thì thoát ngay, không xử lý thêm dữ liệu
      if (cancelledRef.current) break;

      const { done, value } = await reader.read();
      if (done) break;

      // Kiểm tra lại sau khi đọc chunk
      if (cancelledRef.current) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const dataStr = line.slice(6).trim();
        if (!dataStr) continue;
        try {
          const event: SseEvent = JSON.parse(dataStr);
          // Không xử lý event nếu đã cancel
          if (cancelledRef.current) break;
          switch (event.type) {
            case "plan":
              setTotalWidgets(event.total);
              if (event.tasks) setTasks(event.tasks as TaskInfo[]);
              if (event.session_id) setSessionId(event.session_id);
              // Show the first pending task as current
              setCurrentTaskIndex(startIndex < event.total ? startIndex : 0);
              break;
            case "task":
              setCurrentTaskIndex(event.index);
              break;
            case "widget":
            case "error":
              setWidgets((prev) => {
                const updated = [...prev];
                updated[event.index] = event.widget;
                return updated;
              });
              // Update ref immediately so history saving has latest widgets
              widgetsRef.current[event.index] = event.widget;
              if (event.index === event.total - 1) setCurrentTaskIndex(null);
              break;
            case "done":
              setIsStreaming(false);
              setCurrentTaskIndex(null);
              if (event.session_id) setSessionId(event.session_id);
              if (event.history_id) setHistoryId(event.history_id);
              // Save completed widgets to localStorage history
              saveToLocalHistory();
              break;
          }
        } catch {
          // skip malformed JSON
        }
      }
    }
  };

  const autoResumeSession = async (session: any) => {
    // Guard: chỉ cho phép 1 stream tại 1 thời điểm
    if (streamingRef.current) return;
    streamingRef.current = true;
    cancelledRef.current = false;

    const q = session.question;
    const existingWidgets: AiWidgetData[] = session.completed_tasks?.filter(Boolean) || [];
    const completedCount = existingWidgets.length;
    const sessionId = session.session_id;

    // All tasks already done — show widgets (backend finalize was missed, clean up)
    if (completedCount >= session.total_tasks) {
      setWidgets(existingWidgets);
      setTotalWidgets(session.total_tasks);
      setTasks(session.tasks || []);
      setQuestion(session.question || "");
      try { await api.delete(`/dashboard/session/${sessionId}`); } catch { }
      streamingRef.current = false;
      return;
    }

    // Abort existing stream if any, but DON'T reset streamingRef
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);

    setWidgets(existingWidgets);
    setTotalWidgets(session.total_tasks);
    setTasks(session.tasks || []);
    setStreamError(null);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Pass session_id so backend restores task plan from Redis (no re-planning)
      const response = await api.post("/dashboard/stream", {
        question: q,
        session_id: sessionId,
        start_index: completedCount,
        existing_widgets: existingWidgets,
      }, {
        signal: controller.signal,
        responseType: "stream",
        adapter: "fetch",
        transformResponse: [],
      });

      if (response.status >= 400) {
        throw new Error(response.data?.detail || `HTTP ${response.status}`);
      }

      await processStream(response, completedCount);
    } catch (err: any) {
      if (err.name === "AbortError" || err.code === "ERR_CANCELED") return;
      setStreamError(err.message || "Stream failed");
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      streamingRef.current = false;
    }
  };

  const resumeSession = useCallback(async () => {
    if (!activeSession) return;
    if (streamingRef.current) return; // Guard
    streamingRef.current = true;
    cancelledRef.current = false;

    const q = activeSession.question;
    const existingWidgets: AiWidgetData[] = activeSession.completed_tasks?.filter(Boolean) || [];
    const completedCount = existingWidgets.length;
    const oldSessionId = activeSession.session_id;

    setActiveSession(null);

    // All tasks done — show widgets (backend finalize was missed, clean up)
    if (completedCount >= activeSession.total_tasks) {
      setWidgets(existingWidgets);
      setTotalWidgets(activeSession.total_tasks);
      setTasks(activeSession.tasks || []);
      setQuestion(q);
      try { await api.delete(`/dashboard/session/${oldSessionId}`); } catch { }
      streamingRef.current = false;
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);

    setWidgets(existingWidgets);
    setTotalWidgets(activeSession.total_tasks);
    setTasks(activeSession.tasks || []);
    setStreamError(null);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await api.post("/dashboard/stream", {
        question: q,
        session_id: oldSessionId,
        start_index: completedCount,
        existing_widgets: existingWidgets,
      }, {
        signal: controller.signal,
        responseType: "stream",
        adapter: "fetch",
        transformResponse: [],
      });

      if (response.status >= 400) {
        throw new Error(response.data?.detail || `HTTP ${response.status}`);
      }

      await processStream(response, completedCount);
    } catch (err: any) {
      if (err.name === "AbortError" || err.code === "ERR_CANCELED") return;
      setStreamError(err.message || "Stream failed");
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      streamingRef.current = false;
    }
  }, [activeSession, handleStreamCancel, processStream]);

  const discardSession = useCallback(async () => {
    const sid = activeSession?.session_id || sessionId;
    if (sid) {
      try {
        await api.delete(`/dashboard/session/${sid}`);
      } catch (err) {
        console.error("Failed to delete session on discard:", err);
      }
    }
    setActiveSession(null);
    setWidgets([]);
    setTotalWidgets(null);
    setTasks([]);
    setCurrentTaskIndex(null);
    setSessionId(null);
    setHistoryId(null);
  }, [activeSession, sessionId]);

  const resetAll = useCallback(() => {
    setWidgets([]);
    setTotalWidgets(null);
    setTasks([]);
    setCurrentTaskIndex(null);
    setStreamError(null);
    setIsStreaming(false);
    setAnalysis(null);
    setIsAnalyzing(false);
    setAnalysisError(null);
    setSelectedOptions(new Set());
    setEnhancedQuestion("");
    setSessionId(null);
    setHistoryId(null);
    setActiveSession(null);
    setWasCancelled(false);
    setSavedToHistory(false);
  }, []);

  const startStream = useCallback(async (q: string) => {
    if (streamingRef.current) return; // Guard
    streamingRef.current = true;
    cancelledRef.current = false;

    // Chỉ cancel HTTP request cũ, KHÔNG reset streamingRef/cancelledRef
    cancelInternal();

    setWidgets([]);
    setTotalWidgets(null);
    setTasks([]);
    setCurrentTaskIndex(null);
    setStreamError(null);
    setSessionId(null);
    setHistoryId(null);
    setWasCancelled(false);
    setSavedToHistory(false);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await api.post("/dashboard/stream", { question: q }, {
        signal: controller.signal,
        responseType: "stream",
        adapter: "fetch",
        transformResponse: [],
      });

      if (response.status >= 400) {
        throw new Error(response.data?.detail || `HTTP ${response.status}`);
      }

      await processStream(response, 0);
    } catch (err: any) {
      if (err.name === "AbortError" || err.code === "ERR_CANCELED") return;
      setStreamError(err.message || "Stream failed");
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      streamingRef.current = false;
    }
  }, [cancelInternal, processStream]);

  const handleAnalyze = useCallback(async (q: string) => {
    if (!q.trim() || isAnalyzing || isStreaming) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysis(null);
    setSelectedOptions(new Set());
    setWidgets([]);
    setTotalWidgets(null);
    setStreamError(null);

    try {
      const response = await api.post("/dashboard/analyze", { question: q });

      if (!response.data?.success) {
        throw new Error(response.data?.error || "Analysis failed");
      }

      const analysisData: QueryAnalysisData = response.data.data;

      // If the question is off-topic, show chatbot response instead of dashboard widgets
      if (analysisData.chatbot_response) {
        // Show chatbot response as a simple card — no dashboard streaming
        setAnalysis(analysisData);
        setEnhancedQuestion(q);
      } else if (analysisData.clear) {
        // Câu hỏi đã rõ → stream luôn, không chặn user
        setEnhancedQuestion(q);
        startStream(q);
      } else {
        // Câu hỏi chưa rõ → show analysis card để user chọn bổ sung
        setAnalysis(analysisData);
        setEnhancedQuestion(q);
      }
    } catch (err: any) {
      setAnalysisError(err.message || "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, isStreaming, startStream]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isStreaming || isAnalyzing) return;

    // Clear previous results and start analysis
    resetAll();
    handleAnalyze(question.trim());
  }, [question, isStreaming, isAnalyzing, handleAnalyze, resetAll]);

  const handleSuggested = useCallback((q: string) => {
    if (isStreaming || isAnalyzing) return;
    setQuestion(q);
    resetAll();
    handleAnalyze(q);
  }, [isStreaming, isAnalyzing, handleAnalyze, resetAll]);

  const handleToggleOption = useCallback((optionId: string) => {
    setSelectedOptions((prev) => {
      const next = new Set(prev);
      if (next.has(optionId)) {
        next.delete(optionId);
      } else {
        next.add(optionId);
      }
      return next;
    });
  }, []);

  const handleEnhanceAndAsk = useCallback(() => {
    if (!analysis) return;

    // Build enhanced question by appending selected suggestions
    let finalQuestion = question;
    for (const opt of analysis.options) {
      if (selectedOptions.has(opt.id) && opt.suggestion) {
        finalQuestion += opt.suggestion;
      }
    }

    setEnhancedQuestion(finalQuestion);
    setAnalysis(null);
    setSelectedOptions(new Set());
    startStream(finalQuestion);
  }, [analysis, question, selectedOptions, startStream]);

  const handleSkipAnalysis = useCallback(() => {
    if (!analysis) return;
    setAnalysis(null);
    setSelectedOptions(new Set());
    startStream(question);
  }, [analysis, question, startStream]);

  const handleViewHistory = useCallback((item: HistoryItem) => {
    // Show selected history item's widgets and collapse the list
    setViewingHistoryItem(item);
    setShowHistoryList(false);
  }, []);

  const handleBackToHistoryList = useCallback(() => {
    setShowHistoryList(true);
    setViewingHistoryItem(null);
  }, []);

  const isPending = isStreaming || (totalWidgets !== null && widgets.length < totalWidgets);

  return (
    <div className="relative min-h-screen bg-[var(--bg-main)] px-4 py-8 sm:px-8">
      {/* Signature: Ambient gradient blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-[#FF5A1F]/8 to-transparent blur-3xl transition-opacity duration-500 dark:from-[#FF5A1F]/15" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-gradient-to-tr from-[#6366F1]/8 to-transparent blur-3xl transition-opacity duration-500 dark:from-[#6366F1]/15" />
      </div>

      <div className="mx-auto max-w-5xl">
        {/* ── Page Header ── */}
        <div className="mb-8">
          <h1
            className="text-3xl font-bold text-[var(--text-primary)]"
            style={{ fontFamily: "'Baloo 2', sans-serif" }}
          >
            AI Dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Ask questions about your business data in natural language
          </p>
        </div>

        {/* ── Tab Bar ── */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 24,
            padding: 4,
            borderRadius: 12,
            background: "var(--bg-progress)",
            border: "1px solid var(--border-light)",
            width: "fit-content",
          }}
        >
          <button
            onClick={() => setActiveTab("ask")}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: activeTab === "ask" ? "var(--primary)" : "transparent",
              color: activeTab === "ask" ? "#fff" : "var(--text-muted)",
              transition: "all 0.2s ease",
            }}
          >
            Question
          </button>
          <button
            onClick={() => setActiveTab("history")}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: activeTab === "history" ? "var(--primary)" : "transparent",
              color: activeTab === "history" ? "#fff" : "var(--text-muted)",
              transition: "all 0.2s ease",
            }}
          >
            History
          </button>
        </div>

        {/* History Tab */}
        {activeTab === "history" && (
          <div style={{ marginBottom: 18 }}>
            {/* Back to list button when viewing a detail */}
            {!showHistoryList && viewingHistoryItem && (
              <div style={{ marginBottom: 12 }}>
                <button
                  className="btn btn-ghost"
                  onClick={handleBackToHistoryList}
                  style={{ fontSize: 13, padding: "8px 16px" }}
                >
                  ← Back to history list
                </button>
              </div>
            )}

            {/* History list — collapsed when viewing an item */}
            {showHistoryList && (
              <HistoryPanel onSelect={handleViewHistory} selectedId={viewingHistoryItem?._id} />
            )}

            {/* Detail view of selected history item */}
            {viewingHistoryItem && (
              <div>
                <div
                  className="card"
                  style={{
                    padding: "14px 20px",
                    marginBottom: 12,
                    borderColor: "rgba(var(--primary-rgb), 0.25)",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                    {viewingHistoryItem.question}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {viewingHistoryItem.widget_count} widget{viewingHistoryItem.widget_count !== 1 ? "s" : ""} • {formatDate(viewingHistoryItem.created_at)}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {viewingHistoryItem.widgets.map((widget, i) => (
                    <AiDashboardWidget key={i} widget={widget} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "ask" && (
          <>
        {/* Active Session Recovery Banner */}
        {activeSession && !isStreaming && (
          <div
            className="card"
            style={{
              marginBottom: 18,
              borderColor: "rgba(20, 184, 166, 0.4)",
              background: "rgba(20, 184, 166, 0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ fontSize: 20 }}>🔄</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                  You have an incomplete dashboard session
                </p>
                <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text-muted)" }}>
                  Question: &ldquo;{activeSession.question}&rdquo; — {widgets.length}/{activeSession.total_tasks} widgets completed
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={resumeSession}
                    style={{ padding: "8px 18px", fontSize: 13 }}
                  >
                    Resume Session
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={discardSession}
                    style={{ padding: "8px 18px", fontSize: 13 }}
                  >
                    Discard
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Checking Session Loading */}
        {checkingSession && (
          <div
            className="card"
            style={{
              marginBottom: 18,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 18px",
            }}
          >
            <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Checking for active session...</span>
          </div>
        )}

        {/* Question Input */}
        <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="form-input"
                placeholder='Ask a question about your data (e.g. "Show monthly revenue")'
                style={{ padding: "14px 18px", fontSize: 15 }}
                disabled={isStreaming || isAnalyzing}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isStreaming || isAnalyzing || !question.trim()}
              style={{ padding: "14px 28px", fontSize: 15, whiteSpace: "nowrap" }}
            >
              {isAnalyzing ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Analyzing...
                </span>
              ) : isStreaming ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Generating...
                </span>
              ) : (
                "Ask"
              )}
            </button>
            {isStreaming && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleStreamCancel}
                style={{ padding: "14px 20px", fontSize: 15, whiteSpace: "nowrap" }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Suggested Questions */}
        <div style={{ marginBottom: 28 }}>
          <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
            Try asking:
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                className="btn btn-ghost btn-sm"
                onClick={() => handleSuggested(q)}
                disabled={isStreaming || isAnalyzing}
                style={{
                  fontSize: 12,
                  borderColor: "rgba(148, 163, 184, 0.2)",
                  color: "#94a3b8",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Analysis Error State */}
        {analysisError && (
          <div
            className="card"
            style={{
              marginBottom: 18,
              borderColor: "rgba(239, 68, 68, 0.32)",
              color: "#fca5a5",
            }}
          >
            <p style={{ margin: 0 }}>
              Analysis failed: {analysisError}
            </p>
          </div>
        )}

        {/* Stream Error State */}
        {streamError && (
          <div
            className="card"
            style={{
              marginBottom: 18,
              borderColor: "rgba(239, 68, 68, 0.32)",
              color: "#fca5a5",
            }}
          >
            <p style={{ margin: 0 }}>
              Failed to generate dashboard: {streamError}
            </p>
          </div>
        )}

        {/* Chatbot Response - shown when question is off-topic */}
        {analysis && analysis.chatbot_response && !isStreaming && !isAnalyzing && (
          <div
            className="card"
            style={{
              marginBottom: 18,
              padding: "20px 24px",
              borderColor: "rgba(59, 130, 246, 0.3)",
              background: "var(--info-bg)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>🤖</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 600, color: "var(--info)" }}>
                  Answer
                </p>
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {analysis.chatbot_response}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Result - Show AI Suggestions */}
        {analysis && !analysis.chatbot_response && !isStreaming && !isAnalyzing && (
          <div style={{ marginBottom: 24 }}>
            {/* Reason card */}
            <div
              className="card"
              style={{
                marginBottom: 16,
                padding: "16px 20px",
                borderColor: analysis.clear
                  ? "rgba(34, 197, 94, 0.3)"
                  : "rgba(234, 179, 8, 0.3)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>
                  {analysis.clear ? "✅" : "💡"}
                </span>
                <div>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {analysis.reason}
                  </p>
                </div>
              </div>
            </div>

            {/* Suggestions */}
            {analysis.options.length > 0 && (
              <div
                className="card"
                style={{ padding: "16px 20px" }}
              >
                <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                  Suggested enhancements (select to improve your question):
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {analysis.options.map((opt) => {
                    const isSelected = selectedOptions.has(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleToggleOption(opt.id)}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                          padding: "12px 16px",
                          borderRadius: 8,
                          border: `1px solid ${isSelected
                              ? "rgba(20, 184, 166, 0.5)"
                              : "rgba(148, 163, 184, 0.2)"
                            }`,
                          background: isSelected
                            ? "rgba(var(--primary-rgb), 0.1)"
                            : "transparent",
                          color: isSelected ? "var(--primary)" : "var(--text-muted)",
                          cursor: "pointer",
                          textAlign: "left",
                          fontSize: 13,
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>
                          {isSelected ? "🔘" : "○"}
                        </span>
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: 2, color: "var(--text-primary)" }}>
                              {opt.label}
                            </div>
                            <div style={{ color: "var(--text-muted)", lineHeight: 1.4 }}>
                              {opt.context}
                            </div>
                            {opt.suggestion && (
                              <div
                                style={{
                                  marginTop: 4,
                                  padding: "4px 8px",
                                  background: "rgba(148, 163, 184, 0.08)",
                                  borderRadius: 4,
                                  fontSize: 12,
                                  color: "var(--text-secondary)",
                                  fontStyle: "italic",
                                }}
                              >
                                +{opt.suggestion}
                              </div>
                            )}
                          </div>
                      </button>
                    );
                  })}
                </div>

                {/* Preview of enhanced question */}
                {selectedOptions.size > 0 && (
                  <div
                    style={{
                      marginTop: 16,
                      padding: "10px 14px",
                      background: "rgba(var(--primary-rgb), 0.08)",
                      borderRadius: 8,
                      border: "1px solid rgba(var(--primary-rgb), 0.2)",
                    }}
                  >
                    <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--primary)", fontWeight: 600 }}>
                      Preview:
                    </p>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)" }}>
                      {question}
                      {analysis.options
                        .filter((o) => selectedOptions.has(o.id))
                        .map((o) => o.suggestion)
                        .join("")}
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleEnhanceAndAsk}
                    style={{ padding: "10px 24px", fontSize: 14 }}
                  >
                    {selectedOptions.size > 0
                      ? `Ask with ${selectedOptions.size} enhancement${selectedOptions.size > 1 ? "s" : ""}`
                      : "Ask as-is"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleSkipAnalysis}
                    style={{ padding: "10px 24px", fontSize: 14 }}
                  >
                    Skip adjustments
                  </button>
                </div>
              </div>
            )}

            {/* If no options but clear=False, just show "Ask as-is" button */}
            {analysis.options.length === 0 && !analysis.clear && (
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSkipAnalysis}
                  style={{ padding: "10px 24px", fontSize: 14 }}
                >
                  Ask anyway
                </button>
              </div>
            )}
          </div>
        )}

        {/* Cancel Notification Banner - red, shows which task was interrupted */}
        {wasCancelled && tasks.length > 0 && (
          <div
            style={{
              marginBottom: 18,
              padding: "12px 18px",
              borderRadius: 10,
              background: "var(--danger-bg)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>⛔</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: "var(--danger)", fontWeight: 600, marginBottom: 2 }}>
                Dashboard generation cancelled
              </div>
              <div style={{ fontSize: 13, color: "var(--danger)" }}>
                Task {currentTaskIndex !== null ? currentTaskIndex + 1 : "?"} / {tasks.length} was interrupted
                {currentTaskIndex !== null && tasks[currentTaskIndex] && (
                  <span> — &ldquo;{tasks[currentTaskIndex].question}&rdquo;</span>
                )}
              </div>
            </div>
            {/* <button
              className="btn btn-ghost btn-sm"
              onClick={() => setWasCancelled(false)}
              style={{ padding: "4px 12px", fontSize: 12, color: "#94a3b8", flexShrink: 0 }}
            >
              Dismiss
            </button> */}
          </div>
        )}

        {/* Current Task Indicator - shows what the AI is currently doing */}
        {currentTaskIndex !== null && tasks.length > 0 && !wasCancelled && (
          <div
            style={{
              marginBottom: 18,
              padding: "12px 18px",
              borderRadius: 10,
              background: "rgba(var(--primary-rgb), 0.08)",
              border: "1px solid rgba(var(--primary-rgb), 0.25)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: "var(--primary)", borderTopColor: "transparent", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>
                Task {currentTaskIndex + 1} / {tasks.length}
              </div>
              <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {tasks[currentTaskIndex].question}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, display: "flex", gap: 8 }}>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "1px 8px",
                  borderRadius: 4,
                  background: "var(--bg-tag)",
                }}>
                  Display: {tasks[currentTaskIndex].display}
                </span>
                {tasks[currentTaskIndex].chart_type !== "none" && (
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "1px 8px",
                    borderRadius: 4,
                    background: "var(--info-bg)",
                    color: "var(--info)",
                  }}>
                    Chart: {tasks[currentTaskIndex].chart_type}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Task progress overview - show all tasks and their statuses */}
        {tasks.length > 0 && (isPending || !isStreaming) && widgets.length > 0 && (
          <div
            style={{
              marginBottom: 18,
              padding: "12px 18px",
              borderRadius: 10,
              background: "var(--bg-progress)",
              border: "1px solid var(--border-light)",
            }}
          >
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10, fontWeight: 600 }}>
              Progress
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {tasks.map((task, i) => {
                const widgetDone = widgets[i] !== undefined;
                const isCurrent = currentTaskIndex === i;
                let icon = "⏳";
                let color = "var(--text-muted)";
                if (widgetDone && widgets[i]?.display !== "table" || (widgets[i] && i < currentTaskIndex!)) {
                  icon = "✅";
                  color = "var(--success)";
                } else if (widgetDone) {
                  icon = "✅";
                  color = "var(--success)";
                } else if (isCurrent) {
                  icon = "🔄";
                  color = "var(--primary)";
                } else if (i < (currentTaskIndex ?? 0)) {
                  icon = "✅";
                  color = "var(--success)";
                }
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "6px 8px",
                      borderRadius: 6,
                      background: isCurrent ? "rgba(var(--primary-rgb), 0.06)" : "transparent",
                      fontSize: 13,
                      color: color,
                      transition: "all 0.2s ease",
                    }}
                  >
                    <span style={{ flexShrink: 0, fontSize: 14, marginTop: 1 }}>{icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontWeight: isCurrent ? 500 : 400,
                      }}>
                        {task.question}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
                        <span style={{
                          fontSize: 11,
                          padding: "0 6px",
                          borderRadius: 3,
                          background: "var(--bg-tag)",
                          color: "var(--text-muted)",
                        }}>
                          {task.display}
                        </span>
                        {task.chart_type !== "none" && (
                          <span style={{
                            fontSize: 11,
                            padding: "0 6px",
                            borderRadius: 3,
                            background: "var(--info-bg)",
                            color: "var(--info)",
                          }}>
                            {task.chart_type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading state with skeleton */}
        {(isPending || skeletonCount > 0) && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {widgets.map(
              (widget, i) =>
                widget && (
                  <AiDashboardWidget key={i} widget={widget} />
                )
            )}

            {Array.from({ length: skeletonCount }).map((_, i) => (
              <div
                key={`skel-${i}`}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <div className="card">
                  <div className="skeleton" style={{ height: 24, width: "40%", marginBottom: 16 }} />
                  <div className="skeleton" style={{ height: 200 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isStreaming && !isAnalyzing && !streamError && !analysisError && !analysis && !activeSession && widgets.length === 0 && !isPending && (
          <div className="empty-state" style={{ marginTop: 48 }}>
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-title">Ask a question to get started</div>
            <p className="empty-state-text">
              Type a natural language question above or click one of the suggested questions
              to see AI-powered insights about your business data.
            </p>
          </div>
        )}

        {/* Final render after stream complete */}
        {!isStreaming && !isPending && !analysis && !activeSession && widgets.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {widgets.map((widget, i) => (
              <AiDashboardWidget key={i} widget={widget} />
            ))}
          </div>
        )}

        {/* Result count */}
        {widgets.length > 0 && !isStreaming && !activeSession && (
          <div style={{ textAlign: "center", marginTop: 8, marginBottom: 24 }}>
                <span className="muted" style={{ fontSize: 13 }}>
                  {widgets.length} widget{widgets.length !== 1 ? "s" : ""} generated
                  {(historyId || savedToHistory) && (
                    <span style={{ marginLeft: 8, color: "var(--primary)" }}>
                  ✓ Saved to history
                </span>
              )}
            </span>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}

export default withProtection(AiDashboardPage, ["manager", "admin"]);
