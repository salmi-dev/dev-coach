import { assertEquals } from '@std/assert';
import { parseFrontmatter, serializeFrontmatter, type SnippetFrontmatter } from '../src/storage/frontmatter.ts';

Deno.test('parseFrontmatter extracts metadata and body', () => {
  const content = `---
title: Test
tags:
  - a
  - b
---

Body text here`;

  const { metadata, body } = parseFrontmatter(content);
  assertEquals(metadata.title, 'Test');
  assertEquals(metadata.tags, ['a', 'b']);
  assertEquals(body, 'Body text here');
});

Deno.test('parseFrontmatter returns empty metadata when no frontmatter', () => {
  const content = 'Just some text without frontmatter';
  const { metadata, body } = parseFrontmatter(content);
  assertEquals(metadata, {});
  assertEquals(body, content);
});

Deno.test('parseFrontmatter handles typed SnippetFrontmatter', () => {
  const content = `---
title: JSON Parse
tags:
  - json
  - serde
lang: rust
difficulty: beginner
created: "2026-04-30"
source: coach:sandbox
---

# Parse JSON`;

  const { metadata } = parseFrontmatter<SnippetFrontmatter>(content);
  assertEquals(metadata.title, 'JSON Parse');
  assertEquals(metadata.lang, 'rust');
  assertEquals(metadata.difficulty, 'beginner');
  assertEquals(metadata.source, 'coach:sandbox');
});

Deno.test('serializeFrontmatter produces valid markdown', () => {
  const result = serializeFrontmatter({ title: 'Test', tags: ['a'] }, 'Body');
  assertEquals(result.startsWith('---\n'), true);
  assertEquals(result.includes('title: Test'), true);
  assertEquals(result.includes('tags:'), true);
  assertEquals(result.endsWith('\n\nBody'), true);
});

Deno.test('frontmatter roundtrip preserves data', () => {
  const metadata = {
    title: 'Roundtrip Test',
    tags: ['x', 'y'],
    created: '2026-04-30',
    source: 'coach:ask',
    lang: 'typescript',
  };
  const body = '# Hello\n\nSome content here.';

  const serialized = serializeFrontmatter(metadata, body);
  const parsed = parseFrontmatter(serialized);

  assertEquals(parsed.metadata.title, 'Roundtrip Test');
  assertEquals(parsed.metadata.tags, ['x', 'y']);
  assertEquals(parsed.metadata.lang, 'typescript');
  assertEquals(parsed.body, body);
});

Deno.test('parseFrontmatter handles special characters in YAML', () => {
  const content = `---
title: "Colon: in title"
tags:
  - "tag with spaces"
---

Body`;

  const { metadata } = parseFrontmatter(content);
  assertEquals(metadata.title, 'Colon: in title');
  assertEquals(metadata.tags, ['tag with spaces']);
});
