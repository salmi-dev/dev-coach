import { assertEquals } from '@std/assert';
import { detectClipboardTool } from '../src/utils/clipboard.ts';
import { renderBox, renderStubMessage, SKILL_ICONS } from '../src/utils/ascii.ts';

Deno.test('detectClipboardTool returns a tool on macOS/Linux', async () => {
  const tool = await detectClipboardTool();
  // On CI or macOS, pbcopy should be available; on Linux, xclip/xsel might be
  // We just check it doesn't throw and returns string or null
  assertEquals(typeof tool === 'string' || tool === null, true);
});

Deno.test('renderBox renders with title and lines', () => {
  const result = renderBox('Test', ['Hello', 'World']);
  assertEquals(result.includes('┌─ Test'), true);
  assertEquals(result.includes('Hello'), true);
  assertEquals(result.includes('World'), true);
  assertEquals(result.includes('└'), true);
});

Deno.test('renderBox handles empty lines', () => {
  const result = renderBox('Empty', []);
  assertEquals(result.includes('┌─ Empty'), true);
  assertEquals(result.includes('└'), true);
});

Deno.test('renderBox respects minWidth', () => {
  const result = renderBox('T', ['x'], 40);
  const lines = result.split('\n');
  // Top line should be at least 40 chars wide
  assertEquals(lines[0].length >= 40, true);
});

Deno.test('SKILL_ICONS has all 7 modes', () => {
  const expected = ['ask', 'sandbox', 'project', 'review', 'stats', 'explain', 'compare'];
  for (const mode of expected) {
    assertEquals(mode in SKILL_ICONS, true, `Missing icon for ${mode}`);
  }
});

Deno.test('SKILL_ICONS.ask is correct', () => {
  assertEquals(SKILL_ICONS.ask, '╺━╸');
});

Deno.test('renderStubMessage includes icon and name', () => {
  const msg = renderStubMessage('ask');
  assertEquals(msg.includes('╺━╸'), true);
  assertEquals(msg.includes('coach:ask'), true);
  assertEquals(msg.includes('not yet implemented'), true);
});
