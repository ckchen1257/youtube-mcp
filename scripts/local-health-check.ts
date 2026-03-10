import { runHealthCheck } from "../src/testing/local-smoke.js";

async function main() {
  const baseUrl = process.argv[2] ?? "http://127.0.0.1:3000";
  const result = await runHealthCheck(baseUrl);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
