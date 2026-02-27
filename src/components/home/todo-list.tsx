'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Search } from 'lucide-react';
import Link from 'next/link';
import { trpc } from '@/trpc/client';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

interface TodoListProps {
  animateIn?: boolean;
}

export function TodoList({ animateIn = true }: TodoListProps) {
  const [search, setSearch] = useState('');

  const { data: jobs, isLoading } = trpc.jobs.list.useQuery(
    { limit: 20, search: search || undefined },
    { refetchInterval: 5000 },
  );

  const filtered = useMemo(() => {
    if (!jobs) return [];
    if (!search.trim()) return jobs;
    const q = search.toLowerCase();
    return jobs.filter((j: { title: string | null }) =>
      (j.title || '').toLowerCase().includes(q)
    );
  }, [jobs, search]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={animateIn ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      <div
        className="px-4 pt-4 pb-1"
        style={{
          background: 'var(--task-card-bg)',
          borderTop: '1px solid var(--task-card-border)',
          borderLeft: '1px solid var(--task-card-border)',
          borderRight: '1px solid var(--task-card-border)',
          borderRadius: '24px 24px 0 0',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-[12px] font-medium uppercase tracking-[0.08em]"
            style={{ color: 'var(--task-label)' }}
          >
            Today
          </span>
          <Link
            href="/app/jobs"
            className="text-[13px] font-medium transition-colors duration-200"
            style={{ color: 'var(--task-link)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--task-link-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--task-link)'; }}
          >
            See all &rarr;
          </Link>
        </div>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: 'var(--task-search-icon)' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-3 py-2 text-[13px] rounded-lg outline-none transition-colors duration-150"
            style={{
              background: 'var(--task-search-bg)',
              border: '1px solid var(--task-search-border)',
              color: 'var(--task-search-text)',
            }}
          />
        </div>

        {/* Scrollable task container with fade */}
        <div className="relative">
          <div
            className="overflow-y-auto pr-1 todo-scroll-hide"
            style={{
              height: '130px',
              scrollbarWidth: 'none',
            }}
          >
            <div className="flex flex-col">
              {isLoading && !jobs ? (
                <div
                  className="text-center py-6 text-[13px]"
                  style={{ color: 'var(--task-time)' }}
                >
                  Loading...
                </div>
              ) : filtered.length === 0 ? (
                <div
                  className="text-center py-6 text-[13px]"
                  style={{ color: 'var(--task-time)' }}
                >
                  {search ? 'No tasks found' : 'Tasks you queue will appear here'}
                </div>
              ) : (
                filtered.map((job: { id: string; title: string | null; status: string; updated_at: string }) => {
                  const isDone = job.status === 'completed';
                  return (
                    <div
                      key={job.id}
                      className="flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all duration-150 cursor-pointer"
                      style={{ background: 'transparent' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--task-hover-bg)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* Checkbox */}
                      <Link
                        href={`/app/jobs/${job.id}`}
                        className="w-[18px] h-[18px] rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-150"
                        style={{
                          border: isDone
                            ? '2px solid rgba(52, 199, 89, 0.6)'
                            : '2px solid var(--task-checkbox-border)',
                          background: isDone ? 'rgba(52, 199, 89, 0.15)' : 'transparent',
                        }}
                      >
                        {isDone && <Check className="w-2.5 h-2.5" style={{ color: 'rgba(52, 199, 89, 0.8)' }} strokeWidth={3} />}
                      </Link>

                      {/* Title */}
                      <Link
                        href={`/app/jobs/${job.id}`}
                        className="flex-1 text-[14px] truncate"
                        style={{
                          color: isDone ? 'var(--task-title-done)' : 'var(--task-title)',
                          textDecoration: isDone ? 'line-through' : 'none',
                        }}
                      >
                        {job.title || 'Untitled Task'}
                      </Link>

                      {/* Time */}
                      <span
                        className="text-[12px] flex-shrink-0"
                        style={{ color: 'var(--task-time)' }}
                      >
                        {formatRelativeTime(job.updated_at)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Fade-out gradient overlay at bottom */}
          {filtered.length > 3 && (
            <div
              className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none z-10"
              style={{
                background: 'linear-gradient(to top, var(--task-fade-solid) 0%, var(--task-fade-transparent) 100%)',
              }}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}
