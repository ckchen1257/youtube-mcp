import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("package scripts", () => {
  it("loads .env and .env.local automatically for local server commands and exposes local smoke helpers", async () => {
    const rawPackageJson = await readFile(new URL("../package.json", import.meta.url), "utf8");
    const packageJson = JSON.parse(rawPackageJson) as {
      scripts: Record<string, string>;
    };
    const gitIgnore = await readFile(new URL("../.gitignore", import.meta.url), "utf8");

    expect(packageJson.scripts.dev).toContain("--env-file-if-exists=.env");
    expect(packageJson.scripts.dev).toContain("--env-file-if-exists=.env.local");
    expect(packageJson.scripts.start).toContain("--env-file-if-exists=.env");
    expect(packageJson.scripts.start).toContain("--env-file-if-exists=.env.local");
    expect(packageJson.scripts["test:local:health"]).toBeTruthy();
    expect(packageJson.scripts["test:local:mcp"]).toBeTruthy();
    expect(gitIgnore).toContain(".env.local");
  });
});
