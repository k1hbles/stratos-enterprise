import { callLLM } from "@/lib/ai/call";
import type { LLMMessage, LLMContentBlock, LLMToolDef } from "@/lib/ai/call";
import { executeChatTool } from "@/lib/ai/tools/chat-tools";
import type { ClawFile, SSEEmitter, ExpandData } from "./types";

const MAX_TOOL_ITERATIONS = 15;

const FILE_GEN_TOOLS = new Set([
  "generate_document",
  "generate_presentation",
  "generate_spreadsheet",
  "generate_report",
]);

/** Map mimeType to the fileType discriminant */
function mimeToFileType(mime: string): "pdf" | "xlsx" | "pptx" | "docx" {
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("spreadsheet") || mime.includes("xlsx")) return "xlsx";
  if (mime.includes("presentation") || mime.includes("pptx")) return "pptx";
  return "docx";
}

export async function runClawLoop(
  model: string,
  systemPrompt: string,
  messages: LLMMessage[],
  tools: LLMToolDef[],
  emit: SSEEmitter
): Promise<{ fullResponse: string; files: ClawFile[] }> {
  const conversationMessages: LLMMessage[] = [...messages];
  const files: ClawFile[] = [];
  let fullResponse = "";
  let toolIterations = 0;
  let toolsExecuted = false;

  while (toolIterations <= MAX_TOOL_ITERATIONS) {
    let iterationText = "";

    const response = await callLLM({
      model,
      systemPrompt,
      messages: conversationMessages,
      tools,
      onToken: async (token) => {
        // ALWAYS stream directly for immediate feedback (AAA LLM UX)
        // If the model eventually calls tools, the preamble remains visible
        // as part of the 'reasoning' flow.
        fullResponse += token;
        emit({ type: "text", text: token });
      },
    });

    // No tool calls or explicit end_turn — final response
    if (response.toolCalls.length === 0 || response.stopReason === "end_turn") {
      break;
    }

    // Tool calls present — the preamble (if any) was already emitted above.

    // Build assistant content blocks
    const assistantBlocks: LLMContentBlock[] = [];
    if (response.content) {
      assistantBlocks.push({ type: "text", text: response.content });
    }
    for (const tc of response.toolCalls) {
      assistantBlocks.push({
        type: "tool_use",
        id: tc.id,
        name: tc.name,
        input: tc.input,
      });
    }

    // Execute tools and build results
    const toolResultBlocks: LLMContentBlock[] = [];
    for (const tc of response.toolCalls) {
      emit({ type: "tool_call", toolName: tc.name, toolId: tc.id, args: tc.input });

      const onProgress = (message: string) => {
        emit({ type: "tool_progress", toolId: tc.id, toolName: tc.name, message });
      };
      const result = await executeChatTool(tc.name, tc.input, onProgress);

      if (typeof result === "object" && "file" in result) {
        const file = result.file as ClawFile;
        files.push(file);

        // Build expandData for file generation tools
        let expandData: ExpandData | undefined;
        if (FILE_GEN_TOOLS.has(tc.name)) {
          expandData = {
            type: "file_output",
            fileType: mimeToFileType(file.mimeType),
            fileName: file.name,
            downloadUrl: file.url,
            ...("previewHtml" in result && result.previewHtml
              ? { previewHtml: result.previewHtml as string }
              : {}),
          };
        }

        emit({ type: "tool_result", toolId: tc.id, toolName: tc.name, summary: `Generated ${file.name}`, expandData });
        emit({ type: "file_ready", file });

        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: tc.id,
          content: JSON.stringify({
            success: true,
            file_name: file.name,
            message: "File generated successfully",
          }),
        });
      } else if (typeof result === "object" && "searchResults" in result) {
        // StringResultWithData from web_search
        const summary = result.text.slice(0, 120);
        const expandData: ExpandData = {
          type: "search_results",
          results: result.searchResults!,
        };

        emit({ type: "tool_result", toolId: tc.id, toolName: tc.name, summary, expandData });

        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: tc.id,
          content: result.text,
        });
      } else {
        // Plain string result (web_fetch, think, get_current_time, etc.)
        const text = typeof result === "string" ? result : JSON.stringify(result);
        const summary = text.slice(0, 120);
        emit({ type: "tool_result", toolId: tc.id, toolName: tc.name, summary });

        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: tc.id,
          content: text,
        });
      }
    }

    // Append to conversation for next iteration
    conversationMessages.push({
      role: "assistant",
      content: assistantBlocks,
    });
    conversationMessages.push({
      role: "user",
      content: toolResultBlocks,
    });

    toolsExecuted = true; // Next iteration streams directly
    toolIterations++;
  }

  return { fullResponse, files };
}
