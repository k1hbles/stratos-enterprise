import { callLLM } from '@/lib/ai/call'
import { SECONDARY_MODEL } from '@/lib/ai/model-router'
import { getSessionUserId } from '@/lib/auth/session'

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

export async function POST(req: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { input } = await req.json()
  if (!input || typeof input !== 'string') {
    return Response.json({ error: 'Missing input' }, { status: 400 })
  }

  try {
    const response = await callLLM({
      model: SECONDARY_MODEL,
      systemPrompt: `You are a task parser. Given a natural language description of a task, extract structured fields and return valid JSON only.

Fields to extract:
- title (string): A short, descriptive name for the task
- goal (string): What the task should accomplish
- type ("scheduled" | "triggered" | "proactive"):
  - "scheduled" if it runs on a recurring schedule
  - "triggered" if it runs in response to an event
  - "proactive" if it monitors and acts on its own
- schedule (string, optional): Human-readable schedule like "Every day at 9am", "Every Monday at 8am". Only for scheduled type.
- trigger (string, optional): What event triggers it. Only for triggered type.
- condition (string, optional): What condition to monitor. Only for proactive type.
- mode ("auto" | "openclaw" | "council" | "fullstack"): Default to "auto" unless user specifies otherwise
- integrations (string[]): Any platforms/channels mentioned (e.g. "slack", "email", "discord", "notion")

Return ONLY valid JSON, no markdown fences, no explanation.`,
      messages: [{ role: 'user', content: input }],
    })

    const text = response.content || ''
    const cleaned = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim()
    const task: ParsedTask = JSON.parse(cleaned)

    return Response.json({ task })
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Parse failed'
    return Response.json({ error: errorMessage }, { status: 500 })
  }
}
