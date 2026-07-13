"use client";

import { useState, useRef, useCallback } from "react";

import api from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRouter";
import AiDashboardWidget, { type AiWidgetData } from "./components/AiDashboardWidget";

const SUGGESTED_QUESTIONS = [
  "Show monthly revenue for the last 6 months",
  "Show total orders by status",
  "Show top 5 best-selling products",
  "Show revenue by category",
  "Show daily order count for the last 30 days",
];

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
}

interface SsePlanEvent {
  type: "plan";
  total: number;
}

interface SseWidgetEvent {
  type: "widget" | "error";
  index: number;
  total: number;
  widget: AiWidgetData;
}

interface SseDoneEvent {
  type: "done";
}

type SseEvent = SsePlanEvent | SseWidgetEvent | SseDoneEvent;

export default function AiDashboardPage() {
  const [question, setQuestion] = useState("");
  const [widgets, setWidgets] = useState<AiWidgetData[]>([]);
  const [totalWidgets, setTotalWidgets] = useState<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Analysis state
  const [analysis, setAnalysis] = useState<QueryAnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [enhancedQuestion, setEnhancedQuestion] = useState("");

  const skeletonCount = totalWidgets ? Math.min(totalWidgets - widgets.length, totalWidgets) : 0;

  const handleStreamCancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const resetAll = useCallback(() => {
    setWidgets([]);
    setTotalWidgets(null);
    setStreamError(null);
    setIsStreaming(false);
    setAnalysis(null);
    setIsAnalyzing(false);
    setAnalysisError(null);
    setSelectedOptions(new Set());
    setEnhancedQuestion("");
  }, []);

  const startStream = useCallback(async (q: string) => {
    handleStreamCancel();

    setWidgets([]);
    setTotalWidgets(null);
    setStreamError(null);
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
        const errMsg = response.data?.detail || `HTTP ${response.status}`;
        throw new Error(errMsg);
      }

      const stream: ReadableStream<Uint8Array> = response.data;
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const dataStr = line.slice(6).trim();
          if (!dataStr) continue;

          try {
            const event: SseEvent = JSON.parse(dataStr);

            switch (event.type) {
              case "plan":
                setTotalWidgets(event.total);
                break;

              case "widget":
              case "error":
                setWidgets((prev) => {
                  const updated = [...prev];
                  updated[event.index] = event.widget;
                  return updated;
                });
                break;

              case "done":
                setIsStreaming(false);
                break;
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError" || err.code === "ERR_CANCELED") return;
      setStreamError(err.message || "Stream failed");
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [handleStreamCancel]);

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

      if (analysisData.clear) {
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

  const isPending = isStreaming || (totalWidgets !== null && widgets.length < totalWidgets);

  return (
    <ProtectedRoute roles={["manager"]}>
      <div className="page-container">
        <div className="section-header">
          <div>
            <h1 className="page-title">AI Dashboard</h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>
              Ask questions about your business data in natural language
            </p>
          </div>
        </div>

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

        {/* Analysis Result - Show AI Suggestions */}
        {analysis && !isStreaming && !isAnalyzing && (
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
                  <p style={{ margin: 0, fontSize: 14, color: "#e2e8f0", lineHeight: 1.5 }}>
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
                <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>
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
                          border: `1px solid ${
                            isSelected
                              ? "rgba(20, 184, 166, 0.5)"
                              : "rgba(148, 163, 184, 0.2)"
                          }`,
                          background: isSelected
                            ? "rgba(20, 184, 166, 0.1)"
                            : "transparent",
                          color: isSelected ? "#14b8a6" : "#94a3b8",
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
                          <div style={{ fontWeight: 600, marginBottom: 2, color: "#e2e8f0" }}>
                            {opt.label}
                          </div>
                          <div style={{ color: "#94a3b8", lineHeight: 1.4 }}>
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
                                color: "#64748b",
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
                      background: "rgba(20, 184, 166, 0.08)",
                      borderRadius: 8,
                      border: "1px solid rgba(20, 184, 166, 0.2)",
                    }}
                  >
                    <p style={{ margin: "0 0 4px", fontSize: 12, color: "#14b8a6", fontWeight: 600 }}>
                      Preview:
                    </p>
                    <p style={{ margin: 0, fontSize: 13, color: "#e2e8f0" }}>
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

        {/* Loading state with skeleton */}
        {(isPending || skeletonCount > 0) && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              margin: "0 -6px",
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
                  display: "inline-flex",
                  flexDirection: "column",
                  width: "50%",
                  padding: "0 6px",
                  marginBottom: 18,
                  boxSizing: "border-box",
                  verticalAlign: "top",
                }}
              >
                <div className="card" style={{ height: "100%" }}>
                  <div className="skeleton" style={{ height: 24, width: "40%", marginBottom: 16 }} />
                  <div className="skeleton" style={{ height: 200 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isStreaming && !isAnalyzing && !streamError && !analysisError && !analysis && widgets.length === 0 && !isPending && (
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
        {!isStreaming && !isPending && !analysis && widgets.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              margin: "0 -6px",
            }}
          >
            {widgets.map((widget, i) => (
              <AiDashboardWidget key={i} widget={widget} />
            ))}
          </div>
        )}

        {/* Result count */}
        {widgets.length > 0 && !isStreaming && (
          <div style={{ textAlign: "center", marginTop: 8, marginBottom: 24 }}>
            <span className="muted" style={{ fontSize: 13 }}>
              {widgets.length} widget{widgets.length !== 1 ? "s" : ""} generated
            </span>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}