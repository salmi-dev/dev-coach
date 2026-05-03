/**
 * Project templates for common project types.
 */

export type ProjectType = "cli" | "api" | "script" | "library";

export interface ProjectFile {
  path: string;
  description: string;
}

export interface ProjectTemplate {
  type: ProjectType;
  files: ProjectFile[];
  dirs: string[];
}

const TEMPLATES: Record<ProjectType, ProjectTemplate> = {
  cli: {
    type: "cli",
    files: [
      { path: "deno.json", description: "Deno config with start task" },
      { path: "main.ts", description: "CLI entry point with arg parsing" },
      { path: "src/core.ts", description: "Core logic module" },
      { path: ".gitignore", description: "Git ignore file" },
    ],
    dirs: ["src"],
  },
  api: {
    type: "api",
    files: [
      { path: "deno.json", description: "Deno config with start task" },
      { path: "main.ts", description: "Server entry point" },
      { path: "src/routes.ts", description: "Route definitions" },
      { path: "src/handlers.ts", description: "Request handlers" },
      { path: ".gitignore", description: "Git ignore file" },
    ],
    dirs: ["src"],
  },
  script: {
    type: "script",
    files: [
      { path: "main.ts", description: "Script entry point" },
      { path: "deno.json", description: "Deno config (optional)" },
    ],
    dirs: [],
  },
  library: {
    type: "library",
    files: [
      { path: "deno.json", description: "Deno config with publish settings" },
      { path: "mod.ts", description: "Library entry point" },
      { path: "src/lib.ts", description: "Main library code" },
      { path: "tests/lib_test.ts", description: "Tests" },
      { path: ".gitignore", description: "Git ignore file" },
    ],
    dirs: ["src", "tests"],
  },
};

/** Get a template by type. */
export function getTemplate(type: ProjectType): ProjectTemplate {
  return TEMPLATES[type];
}

/** Get all available template types. */
export function getTemplateTypes(): ProjectType[] {
  return Object.keys(TEMPLATES) as ProjectType[];
}

// ── Type Detection ─────────────────────────────────────────────

const TYPE_KEYWORDS: Record<ProjectType, string[]> = {
  cli: ["cli", "command", "tool", "terminal", "argparse", "flags"],
  api: ["api", "server", "rest", "http", "endpoint", "route", "graphql"],
  script: ["script", "utility", "convert", "transform", "parse", "generate", "simple"],
  library: ["library", "package", "module", "sdk", "crate", "publish"],
};

/** Detect project type from description. */
export function detectProjectType(description: string): ProjectType {
  const lower = description.toLowerCase();
  let bestType: ProjectType = "script"; // default
  let bestScore = 0;

  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS) as Array<[ProjectType, string[]]>) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  return bestType;
}
