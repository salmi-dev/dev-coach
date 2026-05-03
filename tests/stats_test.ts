import { assertEquals } from "@std/assert";
import { renderBar, renderLanguageBars } from "../src/skills/stats.ts";

Deno.test("renderBar full", () => {
  const bar = renderBar(1.0);
  assertEquals(bar.length, 15);
  assertEquals(bar.includes("░"), false);
});

Deno.test("renderBar empty", () => {
  const bar = renderBar(0);
  assertEquals(bar.length, 15);
  assertEquals(bar.includes("█"), false);
});

Deno.test("renderBar half", () => {
  const bar = renderBar(0.5);
  assertEquals(bar.includes("█"), true);
  assertEquals(bar.includes("░"), true);
});

Deno.test("renderLanguageBars limits to 5", () => {
  const langs = Array.from({ length: 8 }, (_, i) => ({ lang: `lang${i}`, count: 10 - i }));
  const bars = renderLanguageBars(langs, 52);
  assertEquals(bars.length, 5);
});

Deno.test("renderLanguageBars handles empty", () => {
  const bars = renderLanguageBars([], 0);
  assertEquals(bars.length, 0);
});
