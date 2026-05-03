import { assertEquals } from "@std/assert";
import { detectLanguage, generateTitle } from "../src/skills/ask.ts";

Deno.test("detectLanguage finds python", () => {
  assertEquals(detectLanguage("how to reverse a list in python"), "python");
});

Deno.test("detectLanguage finds rust", () => {
  assertEquals(detectLanguage("what is cargo and how to use crate"), "rust");
});

Deno.test("detectLanguage finds typescript", () => {
  assertEquals(detectLanguage("how to use deno with typescript"), "typescript");
});

Deno.test("detectLanguage returns undefined for no match", () => {
  assertEquals(detectLanguage("what is the meaning of life"), undefined);
});

Deno.test("detectLanguage finds git", () => {
  assertEquals(detectLanguage("how to rebase in git"), "git");
});

Deno.test("generateTitle strips 'how do I'", () => {
  assertEquals(generateTitle("how do I reverse a list"), "Reverse A List");
});

Deno.test("generateTitle strips 'what is'", () => {
  assertEquals(generateTitle("what is a closure?"), "A Closure");
});

Deno.test("generateTitle handles plain question", () => {
  assertEquals(generateTitle("reverse a list in python"), "Reverse A List In Python");
});

Deno.test("generateTitle truncates long titles", () => {
  const long = "do something very complex with many words that goes on and on and on forever and ever";
  const title = generateTitle(long);
  assertEquals(title.length <= 60, true);
});

Deno.test("generateTitle returns fallback for empty", () => {
  assertEquals(generateTitle(""), "Quick Answer");
});
