'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Clock, Zap, Eye, Plus, Pause, Play, Trash2, Send, Loader2, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

/* ─── Types ──────────────────────────────────────────────────── */

interface Task {
  id: string
  title: string
  goal: string
  type: 'scheduled' | 'triggered' | 'proactive'
  schedule?: string
  trigger?: string
  condition?: string
  mode: 'auto' | 'openclaw' | 'council' | 'fullstack'
  enabled: boolean
  lastRun?: string
  lastRunStatus?: 'success' | 'failed' | 'running'
  lastRunSummary?: string
  integrations: string[]
  created_at: string
}

interface ParsedTask {
  title: string
  goal: string
  type: 'scheduled' | 'triggered' | 'proactive'
  schedule?: string
  trigger?: string
  condition?: string
  mode: 'auto' | 'openclaw' | 'council' | 'fullstack'
  integrations: string[]
}

interface Run {
  id: string
  started_at: string
  finished_at?: string
  status: 'success' | 'failed' | 'running'
  summary?: string
}

/* ─── Helpers ────────────────────────────────────────────────── */

function humanCron(cron: string | null): string {
  if (!cron) return 'No schedule'
  const parts = cron.split(' ')
  if (parts.length !== 5) return cron
  const [min, hour, dom, , dow] = parts
  if (dom === '*' && dow === '*' && hour !== '*' && min !== '*') {
    return `Daily at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`
  }
  if (dow !== '*' && dom === '*') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dayName = days[parseInt(dow)] ?? dow
    return `${dayName} at ${(hour ?? '0').padStart(2, '0')}:${(min ?? '0').padStart(2, '0')}`
  }
  if (hour === '*' && min !== '*') return `Every hour at :${min.padStart(2, '0')}`
  return cron
}

function missionToTask(m: any): Task {
  const params = typeof m.parameters === 'string' ? JSON.parse(m.parameters) : (m.parameters ?? {})
  const channels = typeof m.delivery_channels === 'string' ? JSON.parse(m.delivery_channels) : (m.delivery_channels ?? [])
  return {
    id: m.id,
    title: m.title,
    goal: m.description ?? '',
    type: params.type ?? 'scheduled',
    schedule: m.schedule_cron ? humanCron(m.schedule_cron) : undefined,
    trigger: params.trigger,
    condition: params.condition,
    mode: params.mode ?? 'auto',
    enabled: !!m.active,
    lastRun: m.last_run_at ?? undefined,
    lastRunStatus: params.lastRunStatus,
    lastRunSummary: params.lastRunSummary,
    integrations: channels,
    created_at: m.created_at,
  }
}

function formatRelativeDate(dateStr: string | undefined): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  return `${Math.floor(days / 30)}mo ago`
}

function scheduleToSimpleCron(schedule: string | undefined): string | undefined {
  if (!schedule) return undefined
  const s = schedule.toLowerCase()
  // Try to extract time
  const timeMatch = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  let hour = 9
  let min = 0
  if (timeMatch) {
    hour = parseInt(timeMatch[1])
    min = timeMatch[2] ? parseInt(timeMatch[2]) : 0
    if (timeMatch[3]?.toLowerCase() === 'pm' && hour < 12) hour += 12
    if (timeMatch[3]?.toLowerCase() === 'am' && hour === 12) hour = 0
  }
  if (s.includes('every day') || s.includes('daily')) return `${min} ${hour} * * *`
  if (s.includes('monday')) return `${min} ${hour} * * 1`
  if (s.includes('tuesday')) return `${min} ${hour} * * 2`
  if (s.includes('wednesday')) return `${min} ${hour} * * 3`
  if (s.includes('thursday')) return `${min} ${hour} * * 4`
  if (s.includes('friday')) return `${min} ${hour} * * 5`
  if (s.includes('saturday')) return `${min} ${hour} * * 6`
  if (s.includes('sunday')) return `${min} ${hour} * * 0`
  if (s.includes('every hour')) return `0 * * * *`
  if (s.includes('weekly')) return `${min} ${hour} * * 1`
  if (s.includes('monthly')) return `${min} ${hour} 1 * *`
  return `${min} ${hour} * * *`
}

function RunStatusIcon({ status }: { status: string }) {
  if (status === 'success') return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
  if (status === 'failed') return <XCircle className="w-3.5 h-3.5 text-red-400" />
  return <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
}

const typeIcons = {
  scheduled: Clock,
  triggered: Zap,
  proactive: Eye,
} as const

const typeLabels = {
  scheduled: 'Scheduled',
  triggered: 'Triggered',
  proactive: 'Proactive',
} as const

/* ─── Main Page ──────────────────────────────────────────────── */

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [view, setView] = useState<'empty' | 'detail' | 'create'>('empty')

  // Create state
  const [chatInput, setChatInput] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState<ParsedTask | null>(null)
  const [creating, setCreating] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Detail state
  const [runs, setRuns] = useState<Run[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const selectedTask = tasks.find((t) => t.id === selectedId) ?? null

  /* ─── Data fetching ──────────────────────────── */

  const fetchTasks = useCallback(() => {
    fetch('/api/missions')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => setTasks(data.map(missionToTask)))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const fetchRuns = useCallback((taskId: string) => {
    fetch(`/api/missions/${taskId}/runs`)
      .then((r) => (r.ok ? r.json() : { runs: [] }))
      .then((data) => setRuns(data.runs ?? []))
      .catch(() => setRuns([]))
  }, [])

  useEffect(() => {
    if (selectedId && view === 'detail') {
      fetchRuns(selectedId)
    }
  }, [selectedId, view, fetchRuns])

  /* ─── Handlers ───────────────────────────────── */

  const handleSelectTask = (task: Task) => {
    setSelectedId(task.id)
    setView('detail')
    setDeleteConfirm(false)
  }

  const handleNewTask = () => {
    setSelectedId(null)
    setView('create')
    setChatInput('')
    setParsed(null)
    setParsing(false)
    setCreating(false)
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  const handleParse = async () => {
    if (!chatInput.trim() || parsing) return
    setParsing(true)
    try {
      const res = await fetch('/api/tasks/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: chatInput.trim() }),
      })
      const data = await res.json()
      if (data.task) {
        setParsed(data.task)
      }
    } catch {
      // silent fail — user can retry
    } finally {
      setParsing(false)
    }
  }

  const handleCreate = async () => {
    if (!parsed || creating) return
    setCreating(true)
    try {
      const body: Record<string, any> = {
        title: parsed.title,
        description: parsed.goal,
        skill: 'research',
        scheduleCron: scheduleToSimpleCron(parsed.schedule),
        scheduleTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        active: 1,
        delivery_channels: JSON.stringify(parsed.integrations ?? []),
        parameters: JSON.stringify({
          type: parsed.type,
          mode: parsed.mode,
          trigger: parsed.trigger,
          condition: parsed.condition,
        }),
      }
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const created = await res.json()
        const newTask = missionToTask(created)
        setTasks((prev) => [newTask, ...prev])
        setSelectedId(newTask.id)
        setView('detail')
        setChatInput('')
        setParsed(null)
      }
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (task: Task) => {
    const newActive = !task.enabled ? 1 : 0
    await fetch(`/api/missions/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: newActive }),
    })
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, enabled: !task.enabled } : t))
    )
  }

  const handleDelete = async (task: Task) => {
    await fetch(`/api/missions/${task.id}`, { method: 'DELETE' })
    setTasks((prev) => prev.filter((t) => t.id !== task.id))
    setSelectedId(null)
    setView('empty')
    setDeleteConfirm(false)
  }

  /* ─── Group tasks by type ────────────────────── */

  const allGroups: { type: Task['type']; label: string; tasks: Task[] }[] = [
    { type: 'scheduled' as const, label: 'Scheduled', tasks: tasks.filter((t) => t.type === 'scheduled') },
    { type: 'triggered' as const, label: 'Triggered', tasks: tasks.filter((t) => t.type === 'triggered') },
    { type: 'proactive' as const, label: 'Proactive', tasks: tasks.filter((t) => t.type === 'proactive') },
  ]
  const groups = allGroups.filter((g) => g.tasks.length > 0)

  /* ─── Loading state ──────────────────────────── */

  if (loading) {
    return (
      <div className="flex h-full">
        <div className="w-[300px] border-r border-white/[0.06] p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-6 w-24 rounded bg-white/[0.06]" />
            <div className="h-10 rounded bg-white/[0.04]" />
            <div className="h-10 rounded bg-white/[0.04]" />
          </div>
        </div>
        <div className="flex-1" />
      </div>
    )
  }

  /* ─── Render ─────────────────────────────────── */

  return (
    <div className="flex h-full overflow-hidden">
      {/* ═══ Left Panel ═══ */}
      <div className="w-[300px] flex-shrink-0 border-r border-white/[0.06] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-semibold text-white">Tasks</h1>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/40 uppercase tracking-wider">
              Beta
            </span>
          </div>
          <button
            onClick={handleNewTask}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 text-white/60 hover:text-white hover:bg-white/[0.06]"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Zap className="w-8 h-8 text-white/10 mb-3" />
              <p className="text-[13px] text-white/30">No tasks yet</p>
              <p className="text-[12px] text-white/20 mt-1">Create one to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <TaskSection key={group.type} label={group.label} type={group.type}>
                  {group.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      selected={task.id === selectedId}
                      onClick={() => handleSelectTask(task)}
                    />
                  ))}
                </TaskSection>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Right Panel ═══ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {view === 'empty' && <EmptyRight onNew={handleNewTask} />}
        {view === 'detail' && selectedTask && (
          <TaskDetail
            task={selectedTask}
            runs={runs}
            deleteConfirm={deleteConfirm}
            setDeleteConfirm={setDeleteConfirm}
            onToggle={() => handleToggle(selectedTask)}
            onDelete={() => handleDelete(selectedTask)}
          />
        )}
        {view === 'create' && (
          <TaskCreator
            chatInput={chatInput}
            setChatInput={setChatInput}
            parsing={parsing}
            parsed={parsed}
            creating={creating}
            textareaRef={textareaRef}
            onParse={handleParse}
            onCreate={handleCreate}
            onStartOver={() => {
              setParsed(null)
              setChatInput('')
              setTimeout(() => textareaRef.current?.focus(), 50)
            }}
          />
        )}
      </div>
    </div>
  )
}

/* ─── Left Panel Components ──────────────────────────────────── */

function TaskSection({ label, type, children }: { label: string; type: Task['type']; children: React.ReactNode }) {
  const Icon = typeIcons[type]
  return (
    <div>
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <Icon className="w-3 h-3 text-white/25" />
        <span className="text-[11px] font-medium text-white/30 uppercase tracking-wider">{label}</span>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function TaskRow({ task, selected, onClick }: { task: Task; selected: boolean; onClick: () => void }) {
  const Icon = typeIcons[task.type]
  const subtitle = task.type === 'scheduled'
    ? task.schedule ?? 'No schedule'
    : task.type === 'triggered'
    ? task.trigger ?? 'No trigger'
    : task.condition ?? 'No condition'

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-150 group',
        selected ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
      )}
    >
      <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', selected ? 'text-white/60' : 'text-white/25')} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-[13px] font-medium truncate', selected ? 'text-white' : 'text-white/70')}>
          {task.title}
        </p>
        <p className="text-[11px] text-white/30 truncate">{subtitle}</p>
      </div>
      <div className="flex-shrink-0">
        {task.enabled ? (
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-white/15" />
        )}
      </div>
    </button>
  )
}

/* ─── Right Panel: Empty ─────────────────────────────────────── */

function EmptyRight({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
      <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4">
        <Zap className="w-5 h-5 text-white/15" />
      </div>
      <p className="text-[15px] font-medium text-white/40">No task selected</p>
      <p className="text-[13px] text-white/25 mt-1 max-w-[280px]">
        Select a task from the list or create a new one to get started.
      </p>
      <button
        onClick={onNew}
        className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium text-white/60 bg-white/[0.06] hover:bg-white/[0.08] transition-all duration-150"
      >
        <Plus className="w-3.5 h-3.5" />
        New Task
      </button>
    </div>
  )
}

/* ─── Right Panel: Detail ────────────────────────────────────── */

function TaskDetail({
  task,
  runs,
  deleteConfirm,
  setDeleteConfirm,
  onToggle,
  onDelete,
}: {
  task: Task
  runs: Run[]
  deleteConfirm: boolean
  setDeleteConfirm: (v: boolean) => void
  onToggle: () => void
  onDelete: () => void
}) {
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set())
  const Icon = typeIcons[task.type]

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
        {/* Header labels */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-white/40">
            <Icon className="w-3 h-3" />
            {typeLabels[task.type]}
          </span>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-white/40 capitalize">
            {task.mode}
          </span>
          <span className={cn(
            'text-[11px] font-medium px-2 py-0.5 rounded-full',
            task.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/[0.04] text-white/30'
          )}>
            {task.enabled ? 'Active' : 'Paused'}
          </span>
        </div>

        {/* Title + Goal */}
        <div>
          <h2 className="text-[20px] font-semibold text-white tracking-[-0.01em]">{task.title}</h2>
          {task.goal && (
            <p className="text-[14px] text-white/50 mt-1.5 leading-relaxed">{task.goal}</p>
          )}
        </div>

        {/* Schedule / Trigger / Condition */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
          {task.schedule && (
            <div>
              <span className="text-white/30">Schedule</span>
              <span className="ml-2 text-white/60">{task.schedule}</span>
            </div>
          )}
          {task.trigger && (
            <div>
              <span className="text-white/30">Trigger</span>
              <span className="ml-2 text-white/60">{task.trigger}</span>
            </div>
          )}
          {task.condition && (
            <div>
              <span className="text-white/30">Condition</span>
              <span className="ml-2 text-white/60">{task.condition}</span>
            </div>
          )}
          {task.integrations.length > 0 && (
            <div>
              <span className="text-white/30">Sends to</span>
              <span className="ml-2 text-white/60">{task.integrations.join(', ')}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
          <button
            onClick={onToggle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 bg-white/[0.06] hover:bg-white/[0.08] text-white/60 hover:text-white"
          >
            {task.enabled ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Resume
              </>
            )}
          </button>
          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 text-white/30 hover:text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-red-400">Delete this task?</span>
              <button
                onClick={onDelete}
                className="px-2.5 py-1 rounded-md text-[12px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all duration-150"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-2.5 py-1 rounded-md text-[12px] font-medium text-white/30 hover:text-white/50 transition-all duration-150"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Last run summary */}
        {task.lastRunSummary && (
          <div className="rounded-lg p-3 bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-1">
              {task.lastRunStatus && <RunStatusIcon status={task.lastRunStatus} />}
              <span className="text-[12px] text-white/40">
                Last run {formatRelativeDate(task.lastRun)}
              </span>
            </div>
            <p className="text-[13px] text-white/60">{task.lastRunSummary}</p>
          </div>
        )}

        {/* Run history */}
        <div>
          <h3 className="text-[13px] font-medium text-white/40 mb-3">Run History</h3>
          {runs.length === 0 ? (
            <div className="rounded-lg py-8 text-center bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[13px] text-white/25">No runs yet</p>
              <p className="text-[11px] text-white/15 mt-1">Runs will appear here once this task executes.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {runs.map((run) => {
                const expanded = expandedRuns.has(run.id)
                return (
                  <div key={run.id} className="rounded-lg border border-white/[0.06] overflow-hidden">
                    <button
                      onClick={() => {
                        setExpandedRuns((prev) => {
                          const next = new Set(prev)
                          if (next.has(run.id)) next.delete(run.id)
                          else next.add(run.id)
                          return next
                        })
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.02] transition-all duration-150"
                    >
                      {expanded ? <ChevronDown className="w-3 h-3 text-white/25" /> : <ChevronRight className="w-3 h-3 text-white/25" />}
                      <RunStatusIcon status={run.status} />
                      <span className="text-[12px] text-white/50 flex-1">{formatRelativeDate(run.started_at)}</span>
                      <span className={cn(
                        'text-[11px] font-medium capitalize',
                        run.status === 'success' ? 'text-emerald-400/70' : run.status === 'failed' ? 'text-red-400/70' : 'text-blue-400/70'
                      )}>
                        {run.status}
                      </span>
                    </button>
                    {expanded && run.summary && (
                      <div className="px-3 pb-3 pl-8">
                        <p className="text-[12px] text-white/40 leading-relaxed">{run.summary}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Right Panel: Creator ───────────────────────────────────── */

function TaskCreator({
  chatInput,
  setChatInput,
  parsing,
  parsed,
  creating,
  textareaRef,
  onParse,
  onCreate,
  onStartOver,
}: {
  chatInput: string
  setChatInput: (v: string) => void
  parsing: boolean
  parsed: ParsedTask | null
  creating: boolean
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onParse: () => void
  onCreate: () => void
  onStartOver: () => void
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onParse()
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Instructions */}
          {!parsed && !parsing && (
            <div className="space-y-3">
              <h2 className="text-[18px] font-semibold text-white">Create a new task</h2>
              <p className="text-[14px] text-white/40 leading-relaxed">
                Describe what you want to automate in plain language. Include details about when it should run,
                what it should do, and where to send results.
              </p>
              <div className="space-y-2 text-[13px] text-white/30">
                <p className="font-medium text-white/40">Examples:</p>
                <p>&quot;Every morning at 9am, summarize the top AI news and send to Slack&quot;</p>
                <p>&quot;When a new PR is opened, review the code and post comments&quot;</p>
                <p>&quot;Monitor competitor pricing pages daily and alert me of changes&quot;</p>
              </div>
            </div>
          )}

          {/* Parsing spinner */}
          {parsing && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-white/30 animate-spin mb-3" />
              <p className="text-[13px] text-white/30">Parsing your task...</p>
            </div>
          )}

          {/* Confirmation card */}
          {parsed && !parsing && (
            <div className="space-y-4">
              <h3 className="text-[15px] font-semibold text-white">Does this look right?</h3>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
                <ConfirmField label="Name" value={parsed.title} />
                <ConfirmField label="Goal" value={parsed.goal} />
                <ConfirmField label="Type" value={typeLabels[parsed.type]} />
                <ConfirmField
                  label="When"
                  value={
                    parsed.type === 'scheduled'
                      ? parsed.schedule ?? 'No schedule set'
                      : parsed.type === 'triggered'
                      ? parsed.trigger ?? 'No trigger set'
                      : parsed.condition ?? 'No condition set'
                  }
                />
                <ConfirmField label="Mode" value={parsed.mode} />
                <ConfirmField
                  label="Sends to"
                  value={parsed.integrations.length > 0 ? parsed.integrations.join(', ') : 'None'}
                  warning={
                    parsed.integrations.length > 0
                      ? undefined
                      : undefined
                  }
                />
                {parsed.integrations.length > 0 && (
                  <div className="flex items-start gap-2 pt-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[12px] text-amber-400/70">
                      Make sure your integrations are connected.{' '}
                      <a href="/app/integrations" className="underline hover:text-amber-300 transition-colors">
                        Connect &rarr;
                      </a>
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onCreate}
                  disabled={creating}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 bg-white/[0.1] hover:bg-white/[0.14] text-white disabled:opacity-40"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Task'
                  )}
                </button>
                <button
                  onClick={onStartOver}
                  className="text-[13px] font-medium text-white/30 hover:text-white/50 transition-colors"
                >
                  Start over
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input bar */}
      {!parsed && (
        <div className="border-t border-white/[0.06] px-4 py-3">
          <div className="max-w-lg mx-auto flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your task..."
              rows={2}
              className="flex-1 resize-none rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:ring-1 focus:ring-white/20 placeholder:text-white/20"
              style={{
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.85)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            />
            <button
              onClick={onParse}
              disabled={!chatInput.trim() || parsing}
              className="flex-shrink-0 p-2.5 rounded-lg transition-all duration-150 disabled:opacity-30 bg-white/[0.06] hover:bg-white/[0.1] text-white/60 hover:text-white"
            >
              {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ConfirmField({ label, value, warning }: { label: string; value: string; warning?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[12px] text-white/30 w-16 flex-shrink-0 pt-0.5">{label}</span>
      <div>
        <span className="text-[13px] text-white/70">{value}</span>
        {warning && <p className="text-[11px] text-amber-400/70 mt-0.5">{warning}</p>}
      </div>
    </div>
  )
}
