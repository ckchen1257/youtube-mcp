import { z } from "zod";

const envSchema = z.object({
  HOST: z.string().default("0.0.0.0"),
  MCP_BASE_PATH: z.string().default("/mcp"),
  PORT: z.coerce.number().int().positive().default(3000),
  SERVER_VERSION: z.string().default("0.1.0"),
  YOUTUBE_APP_NAME: z.string().default("youtube-private-mcp-server"),
  YOUTUBE_CLIENT_ID: z.string().min(1),
  YOUTUBE_CLIENT_SECRET: z.string().min(1),
  YOUTUBE_REFRESH_TOKEN: z.string().min(1)
});

export interface AppConfig {
  host: string;
  mcpBasePath: string;
  port: number;
  serverVersion: string;
  youtube: {
    appName: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const requiredKeys = [
    "YOUTUBE_CLIENT_ID",
    "YOUTUBE_CLIENT_SECRET",
    "YOUTUBE_REFRESH_TOKEN"
  ] as const;

  const missingKeys = requiredKeys.filter(key => !env[key]);
  if (missingKeys.length > 0) {
    throw new Error(`Missing required environment variables: ${missingKeys.join(", ")}`);
  }

  const parsed = envSchema.parse(env);

  return {
    host: parsed.HOST,
    mcpBasePath: parsed.MCP_BASE_PATH,
    port: parsed.PORT,
    serverVersion: parsed.SERVER_VERSION,
    youtube: {
      appName: parsed.YOUTUBE_APP_NAME,
      clientId: parsed.YOUTUBE_CLIENT_ID,
      clientSecret: parsed.YOUTUBE_CLIENT_SECRET,
      refreshToken: parsed.YOUTUBE_REFRESH_TOKEN
    }
  };
}
