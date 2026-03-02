'use client';
import { useState, useRef, useCallback } from "react";

export interface StreamState {
  raw: string;
  done: boolean;
  error: string | null;
}

export function useStreamingChat() {
  const [state, setState] = useState<StreamState>({ raw: "", done: false, error: null });
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (conversationId: string, message: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setState({ raw: "", done: false, error: null });

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ conversationId, message }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`Stream error: ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            setState((prev) => ({ ...prev, done: true }));
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.delta) {
              setState((prev) => ({ ...prev, raw: prev.raw + parsed.delta }));
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Unknown error";
      setState((prev) => ({ ...prev, error: msg, done: true }));
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, done: true }));
  }, []);

  const reset = useCallback(() => setState({ raw: "", done: false, error: null }), []);

  return { ...state, send, cancel, reset };
}
