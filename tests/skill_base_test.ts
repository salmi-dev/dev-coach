import { assertEquals } from "@std/assert";
import { detectCommands, hasCommands } from "../src/skills/base.ts";

Deno.test("detectCommands finds code blocks", () => {
  const text = "Here is a command:\n```bash\ngit rebase -i HEAD~3\n```\nDone.";
  const cmds = detectCommands(text);
  assertEquals(cmds.length, 1);
  assertEquals(cmds[0], "git rebase -i HEAD~3");
});

Deno.test("detectCommands finds shell $ lines", () => {
  const text = "Run this:\n  $ docker compose up -d\n  $ docker ps";
  const cmds = detectCommands(text);
  assertEquals(cmds.length, 2);
  assertEquals(cmds[0], "docker compose up -d");
  assertEquals(cmds[1], "docker ps");
});

Deno.test("detectCommands returns empty for no commands", () => {
  const text = "This is just text with no code.";
  assertEquals(detectCommands(text).length, 0);
});

Deno.test("hasCommands returns true when commands exist", () => {
  assertEquals(hasCommands("```\nls -la\n```"), true);
});

Deno.test("hasCommands returns false for plain text", () => {
  assertEquals(hasCommands("No commands here"), false);
});

Deno.test("detectCommands handles multiple code blocks", () => {
  const text = "```js\nconsole.log('a')\n```\nand\n```py\nprint('b')\n```";
  const cmds = detectCommands(text);
  assertEquals(cmds.length, 2);
});
