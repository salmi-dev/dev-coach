import { assertEquals } from "@std/assert";
import { getDb, closeDb } from "../src/db/connection.ts";
import { getMigrations } from "../src/db/migrations.ts";

const TEST_DIR = await Deno.makeTempDir({ prefix: "coach-db-test-" });

Deno.test("getDb creates database and runs migrations", () => {
  const db = getDb(TEST_DIR);

  // Check _migrations table has all versions
  const rows = db.prepare("SELECT version FROM _migrations ORDER BY version").all() as {
    version: number;
  }[];
  const versions = rows.map((r) => r.version);
  const expected = getMigrations().map((m) => m.version);
  assertEquals(versions, expected);

  closeDb();
});

Deno.test("sessions table exists and accepts inserts", () => {
  const db = getDb(TEST_DIR);

  db.prepare(
    "INSERT INTO sessions (ts, mode, lang, tags, query, duration_s) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(new Date().toISOString(), "ask", "rust", '["json"]', "how to parse json", 30);

  const row = db.prepare("SELECT * FROM sessions WHERE mode = 'ask'").get() as Record<
    string,
    unknown
  >;
  assertEquals(row.mode, "ask");
  assertEquals(row.lang, "rust");
  assertEquals(JSON.parse(row.tags as string), ["json"]);

  closeDb();
});

Deno.test("items table exists and accepts inserts", () => {
  const db = getDb(TEST_DIR);

  db.prepare(
    "INSERT INTO items (type, title, path, lang, tags, created) VALUES (?, ?, ?, ?, ?, ?)",
  ).run("snippet", "Parse JSON", "snippets/rust/json-parse.md", "rust", '["json","serde"]', new Date().toISOString());

  const row = db.prepare("SELECT * FROM items WHERE title = 'Parse JSON'").get() as Record<
    string,
    unknown
  >;
  assertEquals(row.type, "snippet");
  assertEquals(row.lang, "rust");

  closeDb();
});

Deno.test("profile table stores key-value pairs", () => {
  const db = getDb(TEST_DIR);

  db.prepare("INSERT OR REPLACE INTO profile (key, value) VALUES (?, ?)").run(
    "primary_languages",
    '["typescript","rust"]',
  );

  const row = db.prepare("SELECT value FROM profile WHERE key = ?").get("primary_languages") as {
    value: string;
  };
  assertEquals(JSON.parse(row.value), ["typescript", "rust"]);

  closeDb();
});

Deno.test("FTS5 search finds matching items", () => {
  const db = getDb(TEST_DIR);

  // The item inserted in a previous test should be searchable
  const rows = db.prepare("SELECT * FROM items_fts WHERE items_fts MATCH ?").all("serde") as Record<
    string,
    unknown
  >[];
  assertEquals(rows.length >= 1, true);

  closeDb();
});

Deno.test("FTS5 search returns empty for non-matching query", () => {
  const db = getDb(TEST_DIR);

  const rows = db.prepare("SELECT * FROM items_fts WHERE items_fts MATCH ?").all("kubernetes") as Record<
    string,
    unknown
  >[];
  assertEquals(rows.length, 0);

  closeDb();
});

Deno.test("migrations are idempotent (re-run does nothing)", () => {
  const db = getDb(TEST_DIR);

  const rows1 = db.prepare("SELECT COUNT(*) as c FROM _migrations").get() as { c: number };
  closeDb();

  // Re-open triggers migration check again
  const db2 = getDb(TEST_DIR);
  const rows2 = db2.prepare("SELECT COUNT(*) as c FROM _migrations").get() as { c: number };
  assertEquals(rows1.c, rows2.c);

  closeDb();
});

// Cleanup
addEventListener("unload", () => {
  try {
    Deno.removeSync(TEST_DIR, { recursive: true });
  } catch { /* ignore */ }
});
