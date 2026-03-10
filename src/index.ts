import { createServer } from "node:http";

import { loadConfig } from "./config/env.js";
import { createApp } from "./http/app.js";
import { createYouTubeClient } from "./youtube/client.js";
import { YouTubeService } from "./youtube/service.js";

async function main() {
  const config = loadConfig();
  const youtubeClient = createYouTubeClient(config);
  const service = new YouTubeService(youtubeClient);
  const app = createApp(config, service);
  const server = createServer(app);

  server.listen(config.port, config.host, () => {
    // eslint-disable-next-line no-console
    console.log(`YouTube MCP server listening on http://${config.host}:${config.port}${config.mcpBasePath}`);
  });
}

main().catch(error => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
