import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/config/env.js";

describe("loadConfig", () => {
  it("parses the required environment variables", () => {
    const config = loadConfig({
      YOUTUBE_CLIENT_ID: "client-id",
      YOUTUBE_CLIENT_SECRET: "client-secret",
      YOUTUBE_REFRESH_TOKEN: "refresh-token",
      PORT: "4010",
      MCP_BASE_PATH: "/custom-mcp",
      HOST: "127.0.0.1"
    });

    expect(config).toEqual({
      host: "127.0.0.1",
      mcpBasePath: "/custom-mcp",
      port: 4010,
      serverVersion: "0.1.0",
      youtube: {
        appName: "youtube-private-mcp-server",
        clientId: "client-id",
        clientSecret: "client-secret",
        refreshToken: "refresh-token"
      }
    });
  });

  it("throws a readable error when required variables are missing", () => {
    expect(() =>
      loadConfig({
        YOUTUBE_CLIENT_ID: "client-id"
      })
    ).toThrowError(/YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN/);
  });
});
