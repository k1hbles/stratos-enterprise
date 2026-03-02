'use client';

import { useState, useRef, useCallback } from 'react';

/* ─── Types ──────────────────────────────────────────────── */

export interface TaskFile {
  fileName: string;
  downloadUrl: string;
  fileSize: number;
}

export interface ToolStep {
  toolId: string;
  toolName: string;
  status: 'running' | 'completed';
  summary?: string;
  message?: string;
}

export type AssistantBlock =
  | { type: 'text'; text: string }
  | { type: 'steps'; steps: ToolStep[] };

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  blocks?: AssistantBlock[];
  file?: TaskFile;
  streaming?: boolean;
  searchResults?: Array<{ title: string; url: string; snippet: string }>;
}

/* ─── Hook ───────────────────────────────────────────────── */

export function useOpenClawChat(conversationId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const sendMessage = useCallback(
    async (text: string, mode?: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: text,
      };

      const assistantId = `temp-assistant-${Date.now()}`;
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          signal: controller.signal,
          body: JSON.stringify({
            conversationId,
            message: text,
            mode: mode ?? 'openclaw',
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || `Request failed: ${res.status}`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error('No response stream');

        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            let parsed: Record<string, unknown>;
            try {
              parsed = JSON.parse(data);
            } catch {
              continue;
            }

            if (parsed.error) throw new Error(parsed.error as string);
            if (parsed.type === 'error') throw new Error((parsed.message as string) || 'Stream error');

            if (parsed.type === 'tool_call') {
              const newStep: ToolStep = {
                toolId: (parsed.toolId as string) ?? `tc-${Date.now()}`,
                toolName: parsed.toolName as string,
                status: 'running',
              };
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantId) return m;
                  const blocks = [...(m.blocks ?? [])];
                  const last = blocks[blocks.length - 1];
                  if (last && last.type === 'steps') {
                    blocks[blocks.length - 1] = { ...last, steps: [...last.steps, newStep] };
                  } else {
                    blocks.push({ type: 'steps', steps: [newStep] });
                  }
                  return { ...m, blocks };
                })
              );
            } else if (parsed.type === 'tool_progress') {
              const toolId = parsed.toolId as string | undefined;
              const progressMsg = parsed.message as string;
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantId || !m.blocks) return m;
                  const blocks = m.blocks.map((b) => {
                    if (b.type !== 'steps') return b;
                    return {
                      ...b,
                      steps: b.steps.map((s) =>
                        s.status === 'running' && (s.toolId === toolId || !toolId)
                          ? { ...s, message: progressMsg }
                          : s
                      ),
                    };
                  });
                  return { ...m, blocks };
                })
              );
            } else if (parsed.type === 'tool_result') {
              const toolId = parsed.toolId as string | undefined;
              const summary = parsed.summary as string | undefined;
              const expandData = parsed.expandData as Record<string, unknown> | undefined;
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantId) return m;
                  const blocks = (m.blocks ?? []).map((b) => {
                    if (b.type !== 'steps') return b;
                    return {
                      ...b,
                      steps: b.steps.map((s) =>
                        s.toolId === toolId || (!toolId && s.status === 'running')
                          ? { ...s, status: 'completed' as const, summary }
                          : s
                      ),
                    };
                  });
                  const update: Partial<ChatMessage> = { blocks };
                  if (expandData?.type === 'search_results') {
                    update.searchResults = expandData.results as Array<{ title: string; url: string; snippet: string }>;
                  }
                  return { ...m, ...update };
                })
              );
            } else if (parsed.type === 'file_ready' || (parsed.type === 'done' && parsed.file)) {
              const f = parsed.file as Record<string, unknown> | undefined;
              if (f) {
                const taskFile: TaskFile = {
                  fileName: (f.name as string) ?? (f.fileName as string),
                  downloadUrl: (f.url as string) ?? (f.downloadUrl as string),
                  fileSize: (f.size as number) ?? (f.fileSize as number) ?? 0,
                };
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, file: taskFile } : m))
                );
              }
            } else if (parsed.type === 'text' && parsed.text) {
              const token = parsed.text as string;
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantId) return m;
                  const blocks = [...(m.blocks ?? [])];
                  const last = blocks[blocks.length - 1];
                  if (last && last.type === 'text') {
                    blocks[blocks.length - 1] = { ...last, text: last.text + token };
                  } else {
                    blocks.push({ type: 'text', text: token });
                  }
                  return { ...m, content: m.content + token, blocks };
                })
              );
            }
            // 'thinking' and 'done' (without file) are ignored — UI handles via streaming flag
          }
        }

        // Finalize
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
          );
        } else {
          console.error('Chat error:', err);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: m.content || 'Sorry, something went wrong. Please try again.',
                    streaming: false,
                  }
                : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [conversationId, isStreaming]
  );

  return { messages, setMessages, isStreaming, sendMessage, stopStreaming };
}
