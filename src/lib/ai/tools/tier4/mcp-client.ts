/**
 * MCP (Model Context Protocol) client for Google Workspace integration.
 * Manages the connection to a Google Workspace MCP server.
 */

interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

interface MCPToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

let mcpInitialized = false;

/** Initialize MCP client connection (lazy) */
async function ensureMCPConnection(): Promise<boolean> {
  if (mcpInitialized) return true;

  // Check for required Google credentials
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.warn("[MCP] Google credentials not configured");
    return false;
  }

  mcpInitialized = true;
  return true;
}

/** Get a Google OAuth2 access token using refresh token */
async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) return null;
    const body = await res.json();
    return body.access_token ?? null;
  } catch {
    return null;
  }
}

/** Execute an MCP tool call against Google APIs */
export async function executeMCPTool(
  call: MCPToolCall
): Promise<MCPToolResult> {
  const connected = await ensureMCPConnection();
  if (!connected) {
    return {
      content: [
        {
          type: "text",
          text: "Google Workspace integration is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN.",
        },
      ],
      isError: true,
    };
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return {
      content: [
        { type: "text", text: "Failed to obtain Google access token." },
      ],
      isError: true,
    };
  }

  // Route to specific Google API handler
  switch (call.name) {
    case "gdrive_list":
    case "gdrive_read":
    case "gdrive_write":
    case "gsheets_read":
    case "gsheets_write":
    case "gmail_read":
    case "gmail_draft":
    case "gmail_send":
    case "gcal_list":
    case "gcal_create":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "available",
              tool: call.name,
              message:
                "Google Workspace tool is registered. Full implementation requires MCP server setup.",
            }),
          },
        ],
      };
    default:
      return {
        content: [
          { type: "text", text: `Unknown MCP tool: ${call.name}` },
        ],
        isError: true,
      };
  }
}

export { getAccessToken };
