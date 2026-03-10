import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_MCP_PATH = "/mcp";

export interface HealthResponse {
  service: string;
  status: string;
}

export interface McpSmokeTestOptions {
  expectedToolNames?: string[];
  serverUrl?: string;
  toolArgs?: Record<string, unknown>;
  toolName?: string;
}

export interface McpSmokeTestResult {
  serverUrl: string;
  toolNames: string[];
  toolResult?: Record<string, unknown>;
}

export function normalizeBaseUrl(baseUrl = DEFAULT_BASE_URL): string {
  return new URL(baseUrl).toString().replace(/\/$/, "");
}

export function normalizeMcpUrl(serverUrl = `${DEFAULT_BASE_URL}${DEFAULT_MCP_PATH}`): string {
  const url = new URL(serverUrl);
  if (url.pathname === "/" || url.pathname === "") {
    url.pathname = DEFAULT_MCP_PATH;
  }

  return url.toString();
}

export async function runHealthCheck(baseUrl = DEFAULT_BASE_URL): Promise<HealthResponse> {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/health`);

  if (!response.ok) {
    throw new Error(`Health check failed with HTTP ${response.status}`);
  }

  return (await response.json()) as HealthResponse;
}

export async function runMcpSmokeTest(options: McpSmokeTestOptions = {}): Promise<McpSmokeTestResult> {
  const serverUrl = normalizeMcpUrl(options.serverUrl);
  const transport = new StreamableHTTPClientTransport(new URL(serverUrl));
  const client = new Client({
    name: "local-smoke-client",
    version: "1.0.0"
  });

  try {
    await client.connect(transport);
    const toolList = await client.listTools();
    const toolNames = toolList.tools.map(tool => tool.name);

    if (options.expectedToolNames) {
      const missingTools = options.expectedToolNames.filter(toolName => !toolNames.includes(toolName));
      if (missingTools.length > 0) {
        throw new Error(`Missing expected MCP tools: ${missingTools.join(", ")}`);
      }
    }

    let toolResult: Record<string, unknown> | undefined;
    if (options.toolName) {
      const result = await client.callTool({
        arguments: options.toolArgs,
        name: options.toolName
      });

      toolResult = (result.structuredContent ?? {
        content: result.content
      }) as Record<string, unknown>;
    }

    return {
      serverUrl,
      toolNames,
      toolResult
    };
  } finally {
    await client.close();
  }
}
