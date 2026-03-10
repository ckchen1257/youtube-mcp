import type { Application, Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { AppConfig } from "../config/env.js";
import { registerYouTubeTools } from "../tools/register-tools.js";
import type { YouTubeServiceApi } from "../youtube/types.js";

const SERVER_NAME = "youtube-private-mcp-server";

function createMcpServer(config: Pick<AppConfig, "serverVersion">, service: YouTubeServiceApi): McpServer {
  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: config.serverVersion
    },
    {
      capabilities: {
        logging: {}
      },
      instructions:
        "Use these tools to access the authenticated channel's uploads, private videos, and known playlist or video IDs."
    }
  );

  registerYouTubeTools(server, service);
  return server;
}

async function handleMcpPost(req: Request, res: Response, config: Pick<AppConfig, "serverVersion">, service: YouTubeServiceApi) {
  const server = createMcpServer(config, service);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : "Internal server error"
        },
        id: null,
        jsonrpc: "2.0"
      });
    }
  } finally {
    await transport.close();
    await server.close();
  }
}

export function createApp(config: Pick<AppConfig, "host" | "mcpBasePath" | "port" | "serverVersion">, service: YouTubeServiceApi): Application {
  const app = createMcpExpressApp({
    host: config.host
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({
      service: SERVER_NAME,
      status: "ok"
    });
  });

  app.post(config.mcpBasePath, async (req, res) => {
    await handleMcpPost(req, res, config, service);
  });

  app.get(config.mcpBasePath, (_req, res) => {
    res.status(405).json({
      error: {
        code: -32000,
        message: "Method not allowed."
      },
      id: null,
      jsonrpc: "2.0"
    });
  });

  app.delete(config.mcpBasePath, (_req, res) => {
    res.status(405).json({
      error: {
        code: -32000,
        message: "Method not allowed."
      },
      id: null,
      jsonrpc: "2.0"
    });
  });

  return app;
}
