import type { AgentTool } from "@/lib/ai/agent/types";
import { getAccessToken } from "./mcp-client";

export const gdriveListTool: AgentTool = {
  name: "gdrive_list",
  description:
    "List files in Google Drive. Can filter by folder, name, or type.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Google Drive search query (e.g. \"name contains 'report'\" or \"mimeType='application/pdf'\").",
      },
      folder_id: {
        type: "string",
        description: "Optional folder ID to list files from.",
      },
      max_results: {
        type: "number",
        description: "Maximum number of results (default 10).",
      },
    },
    required: [],
  },
  isWriteAction: false,
  async execute(args) {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, data: { error: "Google auth not configured" } };
    }

    try {
      const query = typeof args.query === "string" ? args.query : "";
      const maxResults = Number(args.max_results) || 10;

      let q = query;
      if (args.folder_id) {
        q = `'${args.folder_id}' in parents${q ? ` and ${q}` : ""}`;
      }

      const params = new URLSearchParams({
        pageSize: String(maxResults),
        fields: "files(id,name,mimeType,modifiedTime,size)",
        ...(q ? { q } : {}),
      });

      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        return { success: false, data: { error: `Drive API: ${res.status}` } };
      }

      const body = await res.json();
      return {
        success: true,
        data: { files: body.files ?? [], count: body.files?.length ?? 0 },
      };
    } catch (err) {
      return {
        success: false,
        data: { error: err instanceof Error ? err.message : "Drive list failed" },
      };
    }
  },
};

export const gdriveReadTool: AgentTool = {
  name: "gdrive_read",
  description: "Read/download a file from Google Drive by its file ID.",
  input_schema: {
    type: "object",
    properties: {
      file_id: {
        type: "string",
        description: "The Google Drive file ID.",
      },
    },
    required: ["file_id"],
  },
  isWriteAction: false,
  async execute(args) {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, data: { error: "Google auth not configured" } };
    }

    try {
      const fileId = String(args.file_id);

      // Get file metadata first
      const metaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType,size`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!metaRes.ok) {
        return { success: false, data: { error: `File not found: ${metaRes.status}` } };
      }

      const meta = await metaRes.json();

      // For Google Docs types, export as plain text
      let content = "";
      if (meta.mimeType?.startsWith("application/vnd.google-apps.")) {
        const exportRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        content = await exportRes.text();
      } else {
        const dlRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        content = await dlRes.text();
      }

      return {
        success: true,
        data: {
          name: meta.name,
          mimeType: meta.mimeType,
          content: content.slice(0, 20000),
          truncated: content.length > 20000,
        },
      };
    } catch (err) {
      return {
        success: false,
        data: { error: err instanceof Error ? err.message : "Drive read failed" },
      };
    }
  },
};
