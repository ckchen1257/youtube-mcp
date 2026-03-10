import { runMcpSmokeTest } from "../src/testing/local-smoke.js";

const EXPECTED_TOOLS = [
  "youtube_list_my_uploads",
  "youtube_find_my_uploads",
  "youtube_get_video",
  "youtube_get_playlist",
  "youtube_list_playlist_items",
  "youtube_find_playlist_items"
];

async function main() {
  const [serverUrl, toolName, rawToolArgs] = process.argv.slice(2);
  const toolArgs = rawToolArgs ? (JSON.parse(rawToolArgs) as Record<string, unknown>) : undefined;

  const result = await runMcpSmokeTest({
    expectedToolNames: EXPECTED_TOOLS,
    serverUrl,
    toolArgs,
    toolName
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
