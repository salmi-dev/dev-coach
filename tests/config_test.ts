import { assertEquals, assertRejects } from "@std/assert";
import { loadConfig, saveConfig, validateConfig } from "../src/config/config.ts";
import { DEFAULT_CONFIG, CoachConfig } from "../src/config/schema.ts";

const TEST_DIR = await Deno.makeTempDir({ prefix: "coach-test-" });

Deno.test("loadConfig returns defaults when no file exists", async () => {
  const config = await loadConfig(`${TEST_DIR}/nonexistent.yaml`);
  assertEquals(config.library_path, DEFAULT_CONFIG.library_path);
  assertEquals(config.primary_languages, []);
  assertEquals(config.response_style, "concise");
});

Deno.test("saveConfig and loadConfig roundtrip", async () => {
  const path = `${TEST_DIR}/roundtrip.yaml`;
  const config: CoachConfig = {
    library_path: "~/my-coach",
    primary_languages: ["typescript", "rust"],
    frameworks: ["deno", "react"],
    response_style: "detailed",
    os: "darwin",
  };

  await saveConfig(config, path);
  const loaded = await loadConfig(path);

  assertEquals(loaded.library_path, "~/my-coach");
  assertEquals(loaded.primary_languages, ["typescript", "rust"]);
  assertEquals(loaded.frameworks, ["deno", "react"]);
  assertEquals(loaded.response_style, "detailed");
});

Deno.test("loadConfig merges partial config with defaults", async () => {
  const path = `${TEST_DIR}/partial.yaml`;
  await Deno.writeTextFile(path, "library_path: ~/custom\n");

  const config = await loadConfig(path);
  assertEquals(config.library_path, "~/custom");
  assertEquals(config.primary_languages, []); // default
  assertEquals(config.response_style, "concise"); // default
});

Deno.test("loadConfig rejects invalid response_style", async () => {
  const path = `${TEST_DIR}/invalid.yaml`;
  await Deno.writeTextFile(path, "response_style: verbose\n");

  await assertRejects(
    () => loadConfig(path),
    Error,
    "Invalid response_style",
  );
});

Deno.test("validateConfig accepts valid config", () => {
  const error = validateConfig(DEFAULT_CONFIG);
  assertEquals(error, null);
});

Deno.test("saveConfig creates parent directories", async () => {
  const path = `${TEST_DIR}/deep/nested/dir/config.yaml`;
  await saveConfig(DEFAULT_CONFIG, path);
  const content = await Deno.readTextFile(path);
  assertEquals(content.includes("library_path"), true);
});

// Cleanup
addEventListener("unload", () => {
  Deno.removeSync(TEST_DIR, { recursive: true });
});
