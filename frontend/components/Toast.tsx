"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type = "info",
  onClose,
  duration = 3000,
}: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: "✓",
    error: "✕",
    info: "ℹ",
  };

  return (
    <div
      className={`toast-container ${visible ? "visible" : "hidden"}`}
      role="status"
      aria-live="polite"
    >
      <div className={`toast-inner ${type}`}>
        <span className="toast-icon">{icons[type]}</span>
        <span style={{ flex: 1 }}>{message}</span>
        <button
          type="button"
          className="toast-close"
          aria-label="Dismiss"
          onClick={() => {
            setVisible(false);
            setTimeout(onClose, 300);
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
