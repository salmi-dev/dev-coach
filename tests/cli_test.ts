import { assertEquals } from "@std/assert";
import { SUBCOMMANDS, VERSION } from "../src/cli/router.ts";

Deno.test("VERSION is defined", () => {
  assertEquals(typeof VERSION, "string");
  assertEquals(VERSION.length > 0, true);
});

Deno.test("SUBCOMMANDS has all 8 commands", () => {
  const expected = ["init", "ask", "explain", "compare", "sandbox", "review", "project", "stats"];
  for (const cmd of expected) {
    assertEquals(cmd in SUBCOMMANDS, true, `Missing subcommand: ${cmd}`);
  }
});

Deno.test("coach --version prints version", async () => {
  const cmd = new Deno.Command("deno", {
    args: ["run", "--allow-read", "--allow-write", "--allow-env", "--allow-run", "--allow-ffi", "cli.ts", "--version"],
    stdout: "piped",
    stderr: "piped",
  });
  const { stdout, success } = await cmd.output();
  const out = new TextDecoder().decode(stdout);
  assertEquals(success, true);
  assertEquals(out.includes(`dev-coach v${VERSION}`), true);
});

Deno.test("coach --help shows subcommands", async () => {
  const cmd = new Deno.Command("deno", {
    args: ["run", "--allow-read", "--allow-write", "--allow-env", "--allow-run", "--allow-ffi", "cli.ts", "--help"],
    stdout: "piped",
    stderr: "piped",
  });
  const { stdout } = await cmd.output();
  const out = new TextDecoder().decode(stdout);
  assertEquals(out.includes("COMMANDS"), true);
  assertEquals(out.includes("init"), true);
  assertEquals(out.includes("ask"), true);
});

Deno.test("coach ask runs real skill (not stub)", async () => {
  const cmd = new Deno.Command("deno", {
    args: ["run", "--allow-read", "--allow-write", "--allow-env", "--allow-run", "--allow-ffi", "cli.ts", "ask", "test question"],
    stdout: "piped",
    stderr: "piped",
    stdin: "null",
  });
  const { stdout, success } = await cmd.output();
  const out = new TextDecoder().decode(stdout);
  assertEquals(success, true);
  assertEquals(out.includes("coach:ask"), true);
});

Deno.test("coach unknown-cmd exits with error", async () => {
  const cmd = new Deno.Command("deno", {
    args: ["run", "--allow-read", "--allow-write", "--allow-env", "--allow-run", "--allow-ffi", "cli.ts", "foobar"],
    stdout: "piped",
    stderr: "piped",
  });
  const { success, stderr } = await cmd.output();
  const err = new TextDecoder().decode(stderr);
  assertEquals(success, false);
  assertEquals(err.includes("Unknown command"), true);
});
