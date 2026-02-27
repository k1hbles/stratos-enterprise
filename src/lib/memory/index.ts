import { listCoreMemories } from "./core";
import { getRecentBufferMemories } from "./buffer";
import { searchSemanticMemories } from "./semantic";

export { upsertCoreMemory, getCoreMemory, listCoreMemories, deleteCoreMemory } from "./core";
export { summarizeConversation, getRecentBufferMemories } from "./buffer";
export { storeSemanticMemory, searchSemanticMemories } from "./semantic";

/**
 * Build memory context string for system prompts.
 * Combines core memories + recent conversation summaries + relevant semantic memories.
 */
export async function buildMemoryContext(
  userId: string,
  taskContext?: string
): Promise<string> {
  const sections: string[] = [];

  // Core memories (key facts about the user/company)
  const coreMemories = listCoreMemories(userId, undefined, 20);
  if (coreMemories.length > 0) {
    const facts = coreMemories
      .map((m) => `- **${m.key}**: ${m.value}`)
      .join("\n");
    sections.push(`## Known Facts\n${facts}`);
  }

  // Recent conversation summaries
  const bufferMemories = getRecentBufferMemories(userId, 5);
  if (bufferMemories.length > 0) {
    const summaries = bufferMemories
      .map((m) => `- ${m.summary}`)
      .join("\n");
    sections.push(`## Recent Conversations\n${summaries}`);
  }

  // Semantic search (if task context provided)
  if (taskContext) {
    const semanticMemories = await searchSemanticMemories(
      userId,
      taskContext,
      3
    );
    if (semanticMemories.length > 0) {
      const relevant = semanticMemories
        .map((m) => `- ${m.content.slice(0, 300)}`)
        .join("\n");
      sections.push(`## Related Context\n${relevant}`);
    }
  }

  if (sections.length === 0) return "";

  return `\n\n# Memory\nThe following is stored context about this user and their previous interactions:\n\n${sections.join("\n\n")}`;
}
