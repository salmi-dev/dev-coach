/**
 * YAML frontmatter parsing and serialization for markdown files.
 */

import { parse as parseYaml, stringify as stringifyYaml } from '@std/yaml';

// ── Types ──────────────────────────────────────────────────────

/** Common fields present in every saved item's frontmatter. */
export interface BaseFrontmatter {
  title: string;
  tags: string[];
  created: string; // ISO date
  source: string; // which skill created it
}

/** Frontmatter shape for snippet items (adds `lang` and optional difficulty). */
export interface SnippetFrontmatter extends BaseFrontmatter {
  lang: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

/** Frontmatter shape for TLDR items (only base fields). */
export interface TldrFrontmatter extends BaseFrontmatter {}

/** Frontmatter shape for project items (adds `lang`). */
export interface ProjectFrontmatter extends BaseFrontmatter {
  lang: string;
}

/** Discriminated union of all item frontmatter shapes. */
export type ItemFrontmatter = SnippetFrontmatter | TldrFrontmatter | ProjectFrontmatter;

// ── Parse ──────────────────────────────────────────────────────

const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

/** Result of {@link parseFrontmatter}: parsed metadata plus the markdown body. */
export interface ParsedFrontmatter<T = Record<string, unknown>> {
  metadata: T;
  body: string;
}

/**
 * Parse YAML frontmatter from a markdown string.
 * Returns { metadata, body }. If no frontmatter found, metadata is {}.
 */
export function parseFrontmatter<T = Record<string, unknown>>(
  content: string,
): ParsedFrontmatter<T> {
  const match = content.match(FRONTMATTER_REGEX);
  if (!match) {
    return { metadata: {} as T, body: content };
  }

  const yamlStr = match[1];
  const body = match[2].replace(/^\n/, ''); // trim leading newline after ---

  try {
    const metadata = (parseYaml(yamlStr) ?? {}) as T;
    return { metadata, body };
  } catch {
    return { metadata: {} as T, body: content };
  }
}

// ── Serialize ──────────────────────────────────────────────────

/**
 * Serialize metadata and body into a markdown string with YAML frontmatter.
 */
export function serializeFrontmatter(
  metadata: Record<string, unknown>,
  body: string,
): string {
  const yaml = stringifyYaml(metadata).trimEnd();
  return `---\n${yaml}\n---\n\n${body}`;
}
