import { getDb } from "@/lib/db";

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

export function readTodos(conversationId: string): TodoItem[] {
  const db = getDb();
  const row = db
    .prepare("SELECT todos FROM conversations WHERE id = ?")
    .get(conversationId) as { todos?: string } | undefined;
  if (!row?.todos) return [];
  try {
    return JSON.parse(row.todos);
  } catch {
    return [];
  }
}

function writeTodos(conversationId: string, items: TodoItem[]): void {
  const db = getDb();
  db.prepare("UPDATE conversations SET todos = ? WHERE id = ?").run(
    JSON.stringify(items),
    conversationId
  );
}

export function addTodo(conversationId: string, text: string): TodoItem {
  const items = readTodos(conversationId);
  const item: TodoItem = {
    id: crypto.randomUUID(),
    text,
    done: false,
    createdAt: new Date().toISOString(),
  };
  items.push(item);
  writeTodos(conversationId, items);
  return item;
}

export function completeTodo(
  conversationId: string,
  text: string
): TodoItem | null {
  const items = readTodos(conversationId);
  const needle = text.toLowerCase();
  const match = items.find(
    (t) => !t.done && t.text.toLowerCase().includes(needle)
  );
  if (!match) return null;
  match.done = true;
  writeTodos(conversationId, items);
  return match;
}
