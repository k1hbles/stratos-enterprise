// ─── Shared helpers for building raw XML strings from SSE events ──────────────
// Used by both client-side SSE consumers and the server-side chat route.

/** Escape a string for use inside an XML attribute (double-quoted) */
export function sanitizeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Escape rogue closing tags in tool-block content to prevent premature block closure */
export function sanitizeContent(s: string): string {
  return s.replace(/<\/(tool|think|image_generating|image_result)>/g, '&lt;/$1&gt;');
}

/** Map a backend toolName to the icon name used in <tool name="..."> */
export function toolNameToIcon(toolName: string): string {
  if (toolName === 'web_search') return 'search';
  if (toolName === 'web_fetch')  return 'file';
  if (toolName === 'generate_image') return 'image';
  if (toolName === 'create_chart') return 'image';
  if (toolName === 'execute_terminal') return 'terminal';
  if (toolName === 'execute_python') return 'python';
  if (toolName === 'write_todo' || toolName === 'read_todo') return 'todo';
  if (toolName.startsWith('generate_')) return 'generate';
  return 'default';
}

/** Build a human-readable label for a tool call from its name + args */
export function toolCallLabel(toolName: string, args: Record<string, unknown>): string {
  if (toolName === 'web_search') {
    const q = String(args.query ?? '');
    return q ? q.slice(0, 60) : 'Searching the web';
  }
  if (toolName === 'web_fetch') {
    const url = String(args.url ?? '');
    return url ? url.replace(/^https?:\/\//, '').slice(0, 60) : 'Reading page';
  }
  if (toolName === 'generate_presentation') return String(args.title ?? 'Generating presentation').slice(0, 60);
  if (toolName === 'generate_spreadsheet')  return String(args.title ?? 'Generating spreadsheet').slice(0, 60);
  if (toolName === 'generate_document')     return String(args.title ?? 'Generating document').slice(0, 60);
  if (toolName === 'generate_report')       return String(args.title ?? 'Generating report').slice(0, 60);
  if (toolName === 'generate_image')        return String(args.prompt ?? 'Generating image').slice(0, 60);
  if (toolName === 'get_current_time')      return 'Getting current time';
  if (toolName === 'write_todo') {
    const items = args.items as string[] | undefined;
    return items?.length ? `${items.length} task${items.length > 1 ? 's' : ''}` : 'Writing tasks';
  }
  if (toolName === 'read_todo')             return 'Reading task list';
  if (toolName === 'execute_terminal')      return String(args.description ?? args.command ?? 'Running command').slice(0, 60);
  if (toolName === 'execute_python')        return String(args.description ?? 'Running Python').slice(0, 60);
  return toolName.replace(/_/g, ' ');
}
