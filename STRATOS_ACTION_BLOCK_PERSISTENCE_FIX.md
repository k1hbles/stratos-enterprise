# STRATOS — Fix Action Block Persistence on Reload

## PROBLEM

Action blocks (tool calls, search results, file cards, sources panel) disappear after page reload or server restart. The root cause is that only raw text content is persisted to SQLite — structured SSE event metadata (tool_call, tool_result, tool_progress, file_ready, expandData) is streamed live to the client but never saved to the database. On reload, messages go through a legacy rendering path that can only parse inline `<tool>` markup from the content string, losing all rich metadata.

## GOAL

After this fix:
- Action blocks (plan cards, search cards, image results, file cards) persist across reloads
- Sources panel data survives page refresh
- File metadata (file_ready events) is recoverable
- The streaming path and reload path converge on the same data structure
- Zero regressions to existing streaming UX

---

## FILES TO MODIFY

1. `src/lib/db/migrate.ts` — Add `metadata` column to messages table
2. `src/app/api/chat/route.ts` (or equivalent chat streaming route) — Accumulate + persist structured SSE events
3. `src/app/api/conversations/[id]/route.ts` (or equivalent conversation loader) — Return metadata alongside content
4. `src/components/conversation-view.tsx` (or equivalent chat view) — Rehydrate action blocks from persisted metadata on reload

---

## STEP 1: SCHEMA MIGRATION

### File: `src/lib/db/migrate.ts`

Add a `metadata` column to the `messages` table. This stores a JSON string containing all structured SSE event data that was previously lost.

```sql
-- Add to existing migration or create new migration step
ALTER TABLE messages ADD COLUMN metadata TEXT DEFAULT NULL;
```

**Implementation approach:**
- Find the existing `CREATE TABLE messages` block in migrate.ts
- Add `metadata TEXT DEFAULT NULL` as a new column
- Also add an `ALTER TABLE` migration for existing databases that already have the messages table:

```typescript
// In the migration function, after the CREATE TABLE:
try {
  db.exec(`ALTER TABLE messages ADD COLUMN metadata TEXT DEFAULT NULL`);
} catch (e) {
  // Column already exists — safe to ignore
}
```

**The metadata column stores a JSON object with this shape:**

```typescript
interface MessageMetadata {
  toolCalls: Array<{
    id: string;
    name: string;
    label?: string;
    args?: Record<string, any>;
    timestamp: number;
  }>;
  toolResults: Array<{
    id: string;
    toolCallId?: string;
    name?: string;
    result?: any;
    expandData?: {
      sources?: Array<{
        title: string;
        url: string;
        snippet?: string;
        favicon?: string;
      }>;
      [key: string]: any;
    };
    timestamp: number;
  }>;
  toolProgress: Array<{
    id: string;
    toolCallId?: string;
    message?: string;
    imageTag?: string;
    timestamp: number;
  }>;
  fileReady: Array<{
    id: string;
    fileName?: string;
    filePath?: string;
    fileType?: string;
    fileSize?: number;
    downloadUrl?: string;
    timestamp: number;
  }>;
  done?: {
    files?: Array<any>;
    timestamp: number;
  };
}
```

---

## STEP 2: ACCUMULATE & PERSIST METADATA DURING STREAMING

### File: `src/app/api/chat/route.ts` (or your streaming chat route)

Currently, the emit callback forwards ALL SSE event types to the client, but only `text` events are accumulated into `streamedContent`. We need to **also** accumulate structured events into a `streamedMetadata` object and persist it.

### Changes:

**A. Initialize metadata accumulator alongside streamedContent:**

```typescript
// EXISTING (keep):
let streamedContent = '';

// NEW — add right after streamedContent declaration:
let streamedMetadata: MessageMetadata = {
  toolCalls: [],
  toolResults: [],
  toolProgress: [],
  fileReady: [],
};
```

**B. In the emit/callback function that processes SSE events, capture structured events:**

Find the section where SSE events are emitted to the client. It likely looks something like:

```typescript
// Existing pattern (pseudocode):
const emit = (event: SSEEvent) => {
  // Forward to client stream
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  
  // Only accumulate text into persisted content
  if (event.type === 'text') {
    streamedContent += event.content; // or event.data
  }
};
```

**Add metadata capture for each structured event type:**

```typescript
const emit = (event: SSEEvent) => {
  // Forward ALL events to client (unchanged)
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  
  // Accumulate text (unchanged)
  if (event.type === 'text') {
    streamedContent += event.content;
  }
  
  // NEW — Accumulate structured metadata
  if (event.type === 'tool_call') {
    streamedMetadata.toolCalls.push({
      id: event.data?.id || `tc_${Date.now()}`,
      name: event.data?.name || event.data?.tool,
      label: event.data?.label,
      args: event.data?.args || event.data?.arguments,
      timestamp: Date.now(),
    });
  }
  
  if (event.type === 'tool_result') {
    streamedMetadata.toolResults.push({
      id: event.data?.id || `tr_${Date.now()}`,
      toolCallId: event.data?.toolCallId,
      name: event.data?.name,
      result: event.data?.result,
      expandData: event.data?.expandData || event.data?.expand_data,
      timestamp: Date.now(),
    });
  }
  
  if (event.type === 'tool_progress') {
    streamedMetadata.toolProgress.push({
      id: event.data?.id || `tp_${Date.now()}`,
      toolCallId: event.data?.toolCallId,
      message: event.data?.message || event.data?.content,
      imageTag: event.data?.imageTag,
      timestamp: Date.now(),
    });
  }
  
  if (event.type === 'file_ready') {
    streamedMetadata.fileReady.push({
      id: event.data?.id || `fr_${Date.now()}`,
      fileName: event.data?.fileName || event.data?.name,
      filePath: event.data?.filePath || event.data?.path,
      fileType: event.data?.fileType || event.data?.type,
      fileSize: event.data?.fileSize || event.data?.size,
      downloadUrl: event.data?.downloadUrl || event.data?.url,
      timestamp: Date.now(),
    });
  }
  
  if (event.type === 'done') {
    streamedMetadata.done = {
      files: event.data?.files,
      timestamp: Date.now(),
    };
  }
};
```

**C. Persist metadata on finalization:**

Find where the assistant message is finalized (status set to 'complete'). It currently does something like:

```typescript
// EXISTING:
db.prepare('UPDATE messages SET content = ?, status = ? WHERE id = ?')
  .run(result.fullResponse, 'complete', assistantMessageId);
```

**Change to also save metadata:**

```typescript
// NEW:
const metadataJson = JSON.stringify(streamedMetadata);
db.prepare('UPDATE messages SET content = ?, metadata = ?, status = ? WHERE id = ?')
  .run(result.fullResponse, metadataJson, 'complete', assistantMessageId);
```

**D. Also persist metadata during periodic updates (every 2 seconds):**

Find the periodic save (the interval that persists streamedContent during streaming). Update it to also save the current metadata state:

```typescript
// EXISTING pattern:
const saveInterval = setInterval(() => {
  db.prepare('UPDATE messages SET content = ? WHERE id = ?')
    .run(streamedContent, assistantMessageId);
}, 2000);

// NEW:
const saveInterval = setInterval(() => {
  const metadataJson = JSON.stringify(streamedMetadata);
  db.prepare('UPDATE messages SET content = ?, metadata = ? WHERE id = ?')
    .run(streamedContent, metadataJson, assistantMessageId);
}, 2000);
```

---

## STEP 3: RETURN METADATA FROM CONVERSATION API

### File: `src/app/api/conversations/[id]/route.ts` (or equivalent)

Currently the conversation loader returns `{role, content}` for each message. Add `metadata` to the response.

**Find the query that loads messages:**

```typescript
// EXISTING:
const messages = db.prepare(
  'SELECT id, role, content, status, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
).all(conversationId);

// No changes needed to the query — just add metadata to the SELECT:
const messages = db.prepare(
  'SELECT id, role, content, metadata, status, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
).all(conversationId);
```

**Parse metadata before returning:**

```typescript
const formattedMessages = messages.map((msg: any) => ({
  id: msg.id,
  role: msg.role,
  content: msg.content,
  metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
  status: msg.status,
  created_at: msg.created_at,
}));
```

---

## STEP 4: REHYDRATE ACTION BLOCKS ON RELOAD

### File: `src/components/conversation-view.tsx` (or equivalent)

This is the most critical change. Currently:
- **During streaming:** SSE events build rich blocks (action cards, sources, file cards) via `StreamingMessage`
- **On reload:** Messages only have `content` (raw text with inline `<tool>` tags), go through legacy `parsePlanFromText` path — action blocks are partially reconstructed but expandData, sources, and file cards are lost

**The fix: When metadata exists, use it to reconstruct the full rich rendering.**

### A. Update the message type to include metadata:

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: MessageMetadata | null;
  status?: string;
  created_at?: string;
  // existing fields:
  raw?: string;
  blocks?: any[];
}
```

### B. Create a metadata rehydration function:

Add this utility function (either in conversation-view.tsx or a separate utils file):

```typescript
function rehydrateFromMetadata(content: string, metadata: MessageMetadata) {
  // Build the same data structures that streaming produces
  
  // 1. Reconstruct expandData for sources panel
  const expandData: Record<string, any> = {};
  for (const result of metadata.toolResults) {
    if (result.expandData) {
      // Merge all expandData from tool results
      Object.assign(expandData, result.expandData);
    }
  }
  
  // 2. Reconstruct file cards
  const files = metadata.fileReady.map(f => ({
    id: f.id,
    name: f.fileName,
    path: f.filePath,
    type: f.fileType,
    size: f.fileSize,
    url: f.downloadUrl,
  }));
  
  // Also include files from done event
  if (metadata.done?.files) {
    for (const f of metadata.done.files) {
      if (!files.find(existing => existing.name === f.name || existing.path === f.path)) {
        files.push(f);
      }
    }
  }
  
  // 3. Reconstruct tool call blocks for action cards
  const toolCalls = metadata.toolCalls.map(tc => ({
    id: tc.id,
    name: tc.name,
    label: tc.label,
    args: tc.args,
    // Find matching result
    result: metadata.toolResults.find(
      tr => tr.toolCallId === tc.id || tr.name === tc.name
    ),
    // Find matching progress messages
    progress: metadata.toolProgress.filter(
      tp => tp.toolCallId === tc.id
    ),
  }));
  
  return {
    expandData: Object.keys(expandData).length > 0 ? expandData : null,
    files: files.length > 0 ? files : null,
    toolCalls: toolCalls.length > 0 ? toolCalls : null,
    sources: expandData.sources || null,
  };
}
```

### C. Update the message rendering logic:

Find the section where messages are rendered on reload (the part that checks `msg.raw`). Currently:

```typescript
// EXISTING (pseudocode):
if (msg.raw) {
  // StreamingMessage path — rich rendering
  return <StreamingMessage raw={msg.raw} />;
} else {
  // Legacy path — regex parsing of <tool> tags
  return <MessageBubble content={msg.content} />;
}
```

**Change to:**

```typescript
if (msg.raw) {
  // Active streaming — use StreamingMessage (unchanged)
  return <StreamingMessage raw={msg.raw} expandData={msg.expandData} files={msg.files} />;
} else if (msg.metadata) {
  // RELOADED message WITH metadata — full rich reconstruction
  const rehydrated = rehydrateFromMetadata(msg.content, msg.metadata);
  return (
    <>
      {/* Render the text content (still parse inline <tool> tags for plan cards etc.) */}
      <StreamingMessage 
        raw={msg.content} 
        expandData={rehydrated.expandData}
        files={rehydrated.files}
        toolCalls={rehydrated.toolCalls}
        isRehydrated={true}
      />
      
      {/* If StreamingMessage doesn't support these props yet, 
          render supplementary components: */}
      
      {/* Sources panel */}
      {rehydrated.sources && rehydrated.sources.length > 0 && (
        <SourcesPanel sources={rehydrated.sources} />
      )}
      
      {/* File cards */}
      {rehydrated.files && rehydrated.files.map((file: any) => (
        <FileCard key={file.id || file.name} file={file} />
      ))}
    </>
  );
} else {
  // Legacy path — no metadata, parse from content string (backward compat)
  return <MessageBubble content={msg.content} />;
}
```

### D. Feed rehydrated sources into the sources panel state:

Find where `expandData` populates the sources panel during streaming. On reload, do the same from metadata:

```typescript
// In useEffect or initialization when loading messages from API:
useEffect(() => {
  if (initialMessages) {
    // Rehydrate sources panel from persisted metadata
    for (const msg of initialMessages) {
      if (msg.role === 'assistant' && msg.metadata) {
        const rehydrated = rehydrateFromMetadata(msg.content, msg.metadata);
        if (rehydrated.sources) {
          // Feed into whatever state manages the sources panel
          setSourcesData(prev => [...prev, ...rehydrated.sources]);
        }
      }
    }
  }
}, [initialMessages]);
```

---

## STEP 5: VERIFY & TEST

### Test cases:

1. **Fresh stream → reload:** Start a conversation that triggers tool calls (web search, file generation). After stream completes, hard reload the page. Verify:
   - Action blocks still visible
   - Sources panel populated
   - File cards with download links present
   - Plan cards rendered correctly

2. **Mid-stream interrupt → reload:** Start streaming, interrupt mid-way (close tab). Reopen. Verify:
   - Partial metadata saved from last periodic update
   - Whatever action blocks completed are still visible
   - No crashes from incomplete metadata

3. **Old messages (no metadata):** Load a conversation with messages created before this migration. Verify:
   - Falls through to legacy rendering path
   - No errors from null metadata
   - Existing behavior unchanged

4. **Metadata size:** For conversations with many tool calls, verify metadata JSON doesn't grow unreasonably large. Consider pruning `toolProgress` messages (keep only final progress per tool) if they bloat.

---

## IMPORTANT NOTES

- **The `metadata` column is nullable** — old messages without metadata continue to work through the legacy path
- **Don't change the emit callback behavior** — ALL events still stream to client in real-time (the streaming UX is unchanged)
- **The content column still has inline `<tool>` tags** — this is your fallback. Metadata is additive, not replacing content
- **Adapt field names to your actual SSE event shapes** — the examples above use generic field names. Map them to your actual `event.data` structure from `runOpenClaw()`
- **If using Vercel AI SDK** — the streaming callback/handler structure may differ slightly. The principle is the same: intercept each event type in the stream handler and accumulate into the metadata object

---

## SUMMARY OF CHANGES

| File | Change | Risk |
|------|--------|------|
| `migrate.ts` | Add `metadata TEXT` column | Low — ALTER TABLE with default NULL |
| `route.ts` | Accumulate SSE events into metadata object, persist on finalize + periodic save | Medium — core streaming path, test thoroughly |
| `conversations/[id]/route.ts` | Add `metadata` to SELECT, parse JSON before return | Low — additive |
| `conversation-view.tsx` | Rehydrate action blocks from metadata when present | Medium — rendering logic change, must handle null metadata gracefully |

Total estimated implementation time: 2-4 hours.
