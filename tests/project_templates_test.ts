import { assertEquals } from '@std/assert';
import { detectProjectType, getTemplate } from '../src/skills/project-templates.ts';

Deno.test('detectProjectType finds cli', () => {
  assertEquals(detectProjectType('a CLI tool that converts CSV to JSON'), 'cli');
});

Deno.test('detectProjectType finds api', () => {
  assertEquals(detectProjectType('a REST API for managing todos'), 'api');
});

Deno.test('detectProjectType finds script', () => {
  assertEquals(detectProjectType('a simple script to convert files'), 'script');
});

Deno.test('detectProjectType finds library', () => {
  assertEquals(detectProjectType('a library for parsing markdown'), 'library');
});

Deno.test('detectProjectType defaults to script for ambiguous', () => {
  assertEquals(detectProjectType('something cool'), 'script');
});

Deno.test('getTemplate returns files for cli', () => {
  const tmpl = getTemplate('cli');
  assertEquals(tmpl.type, 'cli');
  assertEquals(tmpl.files.length > 0, true);
  assertEquals(tmpl.files.some((f) => f.path === 'main.ts'), true);
});

Deno.test('getTemplate returns files for api', () => {
  const tmpl = getTemplate('api');
  assertEquals(tmpl.files.some((f) => f.path.includes('routes')), true);
});
