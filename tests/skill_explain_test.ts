import { assertEquals } from '@std/assert';
import { conceptToTags, formatRelatedSection } from '../src/skills/explain.ts';

Deno.test('conceptToTags extracts meaningful words', () => {
  const tags = conceptToTags('closures in rust');
  assertEquals(tags.includes('closures'), true);
  assertEquals(tags.includes('rust'), true);
  assertEquals(tags.includes('in'), false); // too short
});

Deno.test('conceptToTags limits to 5 tags', () => {
  const tags = conceptToTags('one two three four five six seven eight');
  assertEquals(tags.length, 5);
});

Deno.test('formatRelatedSection shows items with links', () => {
  const result = formatRelatedSection([
    { title: 'JSON Parse', path: 'snippets/rust/json-parse.md' },
  ]);
  assertEquals(result.includes('[JSON Parse]'), true);
  assertEquals(result.includes('snippets/rust/json-parse.md'), true);
});

Deno.test('formatRelatedSection shows empty message', () => {
  const result = formatRelatedSection([]);
  assertEquals(result.includes('No related items'), true);
});
