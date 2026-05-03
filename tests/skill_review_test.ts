import { assertEquals } from "@std/assert";
import { detectLanguageFromExtension, detectLanguageFromContent } from "../src/skills/review.ts";

Deno.test("detectLanguageFromExtension .rs → rust", () => {
  assertEquals(detectLanguageFromExtension("main.rs"), "rust");
});

Deno.test("detectLanguageFromExtension .ts → typescript", () => {
  assertEquals(detectLanguageFromExtension("app.ts"), "typescript");
});

Deno.test("detectLanguageFromExtension .py → python", () => {
  assertEquals(detectLanguageFromExtension("script.py"), "python");
});

Deno.test("detectLanguageFromExtension unknown → undefined", () => {
  assertEquals(detectLanguageFromExtension("file.xyz"), undefined);
});

Deno.test("detectLanguageFromContent finds rust", () => {
  assertEquals(detectLanguageFromContent("fn main() {\n  let mut x = 5;\n}"), "rust");
});

Deno.test("detectLanguageFromContent finds python", () => {
  assertEquals(detectLanguageFromContent("def hello():\n  import os\n  pass"), "python");
});

Deno.test("detectLanguageFromContent returns undefined for plain text", () => {
  assertEquals(detectLanguageFromContent("hello world"), undefined);
});
