"use client";

import { useMemo } from "react";
import { Globe, ExternalLink } from "lucide-react";
import type { JobStep } from "@/types/jobs";

interface Source {
  url: string;
  title: string;
  domain: string;
  page_age?: string | null;
  fetched: boolean;
}

function extractSources(steps: JobStep[]): Source[] {
  const sources = new Map<string, Source>();

  for (const step of steps) {
    if (
      step.tool_name === "web_search" &&
      Array.isArray((step.result_data as Record<string, unknown>)?.results)
    ) {
      const results = (step.result_data as Record<string, unknown>)
        .results as Record<string, unknown>[];
      for (const r of results) {
        const url = r.url as string | undefined;
        if (url && !sources.has(url)) {
          let domain = "";
          try {
            domain = new URL(url).hostname.replace("www.", "");
          } catch {
            /* ignore */
          }
          sources.set(url, {
            url,
            title: (r.title as string) || url,
            domain,
            page_age: (r.page_age as string) || null,
            fetched: false,
          });
        }
      }
    }

    if (
      step.tool_name === "web_fetch" &&
      (step.result_data as Record<string, unknown>)?.url
    ) {
      const rd = step.result_data as Record<string, unknown>;
      const url = rd.url as string;
      const existing = sources.get(url);
      if (existing) {
        existing.fetched = true;
      } else {
        let domain = "";
        try {
          domain = new URL(url).hostname.replace("www.", "");
        } catch {
          /* ignore */
        }
        sources.set(url, {
          url,
          title: (rd.title as string) || url,
          domain,
          page_age: null,
          fetched: true,
        });
      }
    }
  }

  // Fetched sources first
  return Array.from(sources.values()).sort(
    (a, b) => (b.fetched ? 1 : 0) - (a.fetched ? 1 : 0)
  );
}

export function SourcesPanel({ steps }: { steps: JobStep[] }) {
  const sources = useMemo(() => extractSources(steps), [steps]);

  if (sources.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Globe
          className="h-3.5 w-3.5"
          style={{ color: "var(--text-tertiary)" }}
          strokeWidth={1.5}
        />
        <span
          className="text-[12px] font-medium uppercase tracking-wider"
          style={{ color: "var(--text-tertiary)" }}
        >
          Sources ({sources.length})
        </span>
      </div>

      <div className="space-y-1">
        {sources.map((source) => (
          <a
            key={source.url}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-2.5 rounded-xl px-3 py-2 transition-colors duration-150"
            style={{ background: "transparent" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {/* Favicon */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://www.google.com/s2/favicons?domain=${source.domain}&sz=32`}
              alt=""
              className="h-4 w-4 rounded-sm flex-shrink-0 mt-0.5"
              style={{ opacity: 0.8 }}
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="text-[13px] truncate leading-tight"
                  style={{
                    color: source.fetched
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                  }}
                >
                  {source.title}
                </span>
                {source.fetched && (
                  <span
                    className="text-[10px] font-medium rounded px-1.5 py-0.5 flex-shrink-0"
                    style={{
                      background: "rgba(52, 211, 153, 0.12)",
                      color: "rgba(52, 211, 153, 0.7)",
                    }}
                  >
                    Read
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="text-[11px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {source.domain}
                </span>
                {source.page_age && (
                  <>
                    <span
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      ·
                    </span>
                    <span
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {source.page_age}
                    </span>
                  </>
                )}
              </div>
            </div>

            <ExternalLink
              className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              style={{ color: "var(--text-tertiary)" }}
              strokeWidth={1.5}
            />
          </a>
        ))}
      </div>
    </div>
  );
}
