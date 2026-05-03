import { assertEquals } from "@std/assert";
import { parseSelection, formatSummaryTable, ApproachCollector } from "../src/skills/interactive.ts";

Deno.test("parseSelection 'all' returns all indices", () => {
  assertEquals(parseSelection("all", 5), [1, 2, 3, 4, 5]);
});

Deno.test("parseSelection 'none' returns empty", () => {
  assertEquals(parseSelection("none", 5), []);
});

Deno.test("parseSelection '' returns empty", () => {
  assertEquals(parseSelection("", 5), []);
});

Deno.test("parseSelection '1,3,4' returns specific indices", () => {
  assertEquals(parseSelection("1,3,4", 5), [1, 3, 4]);
});

Deno.test("parseSelection ignores invalid indices", () => {
  assertEquals(parseSelection("1,99", 3), [1]);
});

Deno.test("parseSelection ignores non-numbers", () => {
  assertEquals(parseSelection("1,abc,3", 5), [1, 3]);
});

Deno.test("parseSelection handles spaces", () => {
  assertEquals(parseSelection(" 2 , 4 ", 5), [2, 4]);
});

Deno.test("formatSummaryTable formats numbered list", () => {
  const approaches = [
    { index: 1, title: "Approach A", content: "First approach content", tags: [] },
    { index: 2, title: "Approach B", content: "Second approach content", tags: [] },
  ];
  const result = formatSummaryTable(approaches);
  assertEquals(result.includes("1. **Approach A**"), true);
  assertEquals(result.includes("2. **Approach B**"), true);
});

Deno.test("ApproachCollector add increments index", () => {
  const collector = new ApproachCollector();
  collector.add("First", "content 1");
  collector.add("Second", "content 2");
  assertEquals(collector.count, 2);
  assertEquals(collector.approaches[0].index, 1);
  assertEquals(collector.approaches[1].index, 2);
});
