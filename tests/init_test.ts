import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { exists } from "@std/fs";

const TEST_DIR = await Deno.makeTempDir({ prefix: "coach-init-test-" });

Deno.test("coach init --force creates all expected files (non-interactive)", async () => {
  const configDir = join(TEST_DIR, "config");
  const configPath = join(configDir, "config.yaml");
  const libraryDir = join(TEST_DIR, "library");

  // Set env vars to redirect XDG paths to test dir
  const origConfig = Deno.env.get("XDG_CONFIG_HOME");
  const origData = Deno.env.get("XDG_DATA_HOME");

  try {
    Deno.env.set("XDG_CONFIG_HOME", configDir);
    Deno.env.set("XDG_DATA_HOME", join(TEST_DIR, "data"));

    // Run init non-interactively with --force
    // Since stdin is not a TTY in tests, it uses defaults
    const cmd = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        "--allow-env",
        "--allow-run",
        "--allow-ffi",
        "cli.ts",
        "init",
        "--force",
      ],
      stdout: "piped",
      stderr: "piped",
      stdin: "null",
    });

    const { success, stdout, stderr } = await cmd.output();
    const out = new TextDecoder().decode(stdout);
    const err = new TextDecoder().decode(stderr);

    if (!success) {
      console.log("STDOUT:", out);
      console.log("STDERR:", err);
    }

    assertEquals(success, true, `Init failed: ${err}`);

    // Config should exist
    assertEquals(await exists(join(configDir, "dev-coach", "config.yaml")), true, "config.yaml missing");

    // Database should exist
    assertEquals(await exists(join(TEST_DIR, "data", "dev-coach", "coach.db")), true, "coach.db missing");

    // Check output mentions setup
    assertEquals(out.includes("Welcome"), true);
    assertEquals(out.includes("Setup Complete"), true);
  } finally {
    if (origConfig) Deno.env.set("XDG_CONFIG_HOME", origConfig);
    else Deno.env.delete("XDG_CONFIG_HOME");
    if (origData) Deno.env.set("XDG_DATA_HOME", origData);
    else Deno.env.delete("XDG_DATA_HOME");
  }
});

// Cleanup
addEventListener("unload", () => {
  try {
    Deno.removeSync(TEST_DIR, { recursive: true });
  } catch { /* ignore */ }
});
