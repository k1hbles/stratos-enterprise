// ── Model Routing ─────────────────────────────────────────────────────────
// All standard models route through OpenRouter (Anthropic SDK adapter).
// Nuclear models (Sonnet/Opus) go direct to Anthropic.

export const MODELS = {
  DEFAULT: 'x-ai/grok-4.1-fast',
  THINKING: 'moonshotai/kimi-k2-thinking',
  AGENTIC: 'moonshotai/kimi-k2.5',
  BOARD: 'z-ai/glm-5',
  NUCLEAR_SONNET: 'claude-sonnet-4-6',
  NUCLEAR_OPUS: 'claude-opus-4-6',
} as const;

export const NUCLEAR_MODELS = new Set<string>([
  MODELS.NUCLEAR_SONNET,
  MODELS.NUCLEAR_OPUS,
]);

/** Default model for all secondary/background calls */
export const SECONDARY_MODEL = MODELS.DEFAULT;

export interface RoutingContext {
  message: string;
  mode: string;
  messageHistory?: { role: string; content: string }[];
  hasAttachments?: boolean;
  forceModel?: string;
}

const FILE_GEN = /\b(generate|create|build|make|buat)\b.*\b(report|presentation|spreadsheet|document|pdf|pptx|xlsx|docx|slide|deck|laporan|presentasi|file)\b/i;
const THINKING = /\b(analy[sz]e|compare|research|strategy|evaluate|review|explain|bandingkan|analisis|evaluasi|riset|strategi|hitung|prakiraan)\b/i;
const COUNCIL_MODES = new Set(['council', 'fullstack']);

export function selectModel(ctx: RoutingContext): string {
  if (ctx.forceModel) return ctx.forceModel;

  // Council/fullstack modes → THINKING for complex reasoning
  if (COUNCIL_MODES.has(ctx.mode)) return MODELS.THINKING;

  // File generation → AGENTIC (needs tool use + long output)
  if (FILE_GEN.test(ctx.message)) return MODELS.AGENTIC;

  // Thinking-intensive tasks
  if (THINKING.test(ctx.message)) return MODELS.THINKING;

  // Long messages suggest complexity
  if (ctx.message.length > 500) return MODELS.THINKING;

  // Attachments suggest document analysis
  if (ctx.hasAttachments) return MODELS.AGENTIC;

  return MODELS.DEFAULT;
}

export function nuclearModel(): string {
  return MODELS.NUCLEAR_SONNET;
}
