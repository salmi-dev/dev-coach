import { assertEquals } from "@std/assert";
import { parseComparisonInput } from "../src/skills/compare.ts";

Deno.test("parse 'X vs Y'", () => {
  const r = parseComparisonInput("mutex vs rwlock");
  assertEquals(r.items, ["mutex", "rwlock"]);
  assertEquals(r.context, undefined);
});

Deno.test("parse 'X vs Y in Z'", () => {
  const r = parseComparisonInput("mutex vs rwlock in Rust");
  assertEquals(r.items, ["mutex", "rwlock"]);
  assertEquals(r.context, "Rust");
});

Deno.test("parse 'X versus Y'", () => {
  const r = parseComparisonInput("REST versus GraphQL");
  assertEquals(r.items, ["REST", "GraphQL"]);
});

Deno.test("parse 'X or Y for Z'", () => {
  const r = parseComparisonInput("REST or GraphQL for mobile");
  assertEquals(r.items, ["REST", "GraphQL"]);
  assertEquals(r.context, "mobile");
});

Deno.test("parse 'X compared to Y'", () => {
  const r = parseComparisonInput("Python compared to Rust");
  assertEquals(r.items, ["Python", "Rust"]);
});

Deno.test("parse multi-item 'X vs Y vs Z'", () => {
  const r = parseComparisonInput("REST vs GraphQL vs gRPC");
  assertEquals(r.items, ["REST", "GraphQL", "gRPC"]);
});

Deno.test("parse fallback for unparseable", () => {
  const r = parseComparisonInput("something");
  assertEquals(r.items, ["something"]);
});
