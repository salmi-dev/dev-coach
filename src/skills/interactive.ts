/**
 * Interactive framework — multi-response utilities for sandbox, review, etc.
 */

import { Database } from '@db/sqlite';
import { saveItem, type SaveItemOptions } from '../storage/library.ts';

// ── Types ──────────────────────────────────────────────────────

/** A single approach proposed during an interactive sandbox/review session. */
export interface Approach {
  index: number;
  title: string;
  content: string;
  lang?: string;
  tags: string[];
}

// ── Selection Parsing ──────────────────────────────────────────

/**
 * Parse a selection string into indices.
 * "all" → all indices, "none" → [], "1,3,4" → [1,3,4]
 * Invalid indices are silently ignored.
 */
export function parseSelection(input: string, maxIndex: number): number[] {
  const trimmed = input.trim().toLowerCase();

  if (trimmed === 'all') {
    return Array.from({ length: maxIndex }, (_, i) => i + 1);
  }
  if (trimmed === 'none' || trimmed === '') {
    return [];
  }

  return trimmed
    .split(',')
    .map((s) => parseInt(s.trim()))
    .filter((n) => !isNaN(n) && n >= 1 && n <= maxIndex);
}

// ── Summary Table ──────────────────────────────────────────────

/** Format a list of approaches into a Markdown summary table for display. */
export function formatSummaryTable(approaches: Approach[]): string {
  const lines = approaches.map((a) => {
    const firstLine = a.content.split('\n').find((l) => l.trim().length > 0) || '';
    const brief = firstLine.length > 60 ? firstLine.substring(0, 57) + '...' : firstLine;
    return `  ${a.index}. **${a.title}** — ${brief}`;
  });
  return ['## Summary', '', ...lines].join('\n');
}

// ── Approach Collector ─────────────────────────────────────────

/** Collects multiple {@link Approach} entries and offers an interactive batch-save flow. */
export class ApproachCollector {
  private _approaches: Approach[] = [];
  private _counter = 0;

  get approaches(): Approach[] {
    return [...this._approaches];
  }

  get count(): number {
    return this._approaches.length;
  }

  add(title: string, content: string, lang?: string, tags: string[] = []): Approach {
    this._counter++;
    const approach: Approach = {
      index: this._counter,
      title,
      content,
      lang,
      tags,
    };
    this._approaches.push(approach);
    return approach;
  }

  /**
   * Display summary, prompt for selection, batch save selected as snippets.
   */
  async selectAndSave(
    db: Database,
    options: {
      source: string;
      lang?: string;
      libraryPath?: string;
      sessionId?: number;
    },
  ): Promise<string[]> {
    if (this._approaches.length === 0) return [];

    // Display summary
    console.log();
    console.log(formatSummaryTable(this._approaches));
    console.log();

    // Prompt for selection
    const buf = new Uint8Array(256);
    Deno.stdout.writeSync(
      new TextEncoder().encode(`Which to save? [all / 1,3,4 / none] `),
    );

    let selectionInput = 'none';
    try {
      const n = Deno.stdin.readSync(buf);
      if (n) selectionInput = new TextDecoder().decode(buf.subarray(0, n)).trim();
    } catch {
      // Non-interactive
    }

    const indices = parseSelection(selectionInput, this._approaches.length);
    if (indices.length === 0) {
      console.log('No snippets saved.');
      return [];
    }

    const savedPaths: string[] = [];
    for (const idx of indices) {
      const approach = this._approaches.find((a) => a.index === idx);
      if (!approach) continue;

      const saveOpts: SaveItemOptions = {
        title: approach.title,
        tags: approach.tags,
        lang: options.lang || approach.lang,
        source: options.source,
        sessionId: options.sessionId,
      };

      const path = await saveItem(db, 'snippet', approach.content, saveOpts, options.libraryPath);
      savedPaths.push(path);
      console.log(`  ✅ Saved: ${path}`);
    }

    console.log(`\n${savedPaths.length} snippet(s) saved.`);
    return savedPaths;
  }
}
