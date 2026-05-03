/**
 * coach:project — Multi-turn mini-project builder.
 */

import { join } from "@std/path";
import { SKILL_ICONS } from "../utils/ascii.ts";
import { detectLanguage } from "./ask.ts";
import { detectProjectType, getTemplate, type ProjectType } from "./project-templates.ts";
import { serializeFrontmatter } from "../storage/frontmatter.ts";
import { toSlug } from "../storage/library.ts";
import { indexItem } from "../storage/sync.ts";
import { regenerateDashboard } from "../storage/dashboard.ts";
import { logSession } from "../db/logger.ts";
import type { Skill, SkillResult, SessionContext } from "./base.ts";

/** Render an ASCII tree for a file list. */
export function renderFileTree(name: string, files: string[]): string {
  const lines = [`${name}/`];
  for (let i = 0; i < files.length; i++) {
    const prefix = i === files.length - 1 ? "└── " : "├── ";
    lines.push(prefix + files[i]);
  }
  return lines.join("\n");
}

export const projectSkill: Skill = {
  id: "project",
  icon: SKILL_ICONS.project,
  name: "coach:project",

  async run(input: string, context: SessionContext): Promise<SkillResult> {
    const startTime = Date.now();
    const lang = detectLanguage(input) || context.config.primary_languages[0] || "typescript";
    const projectType = detectProjectType(input);
    const template = getTemplate(projectType);
    const slug = toSlug(input);

    // All files including README
    const allFiles = ["README.md", ...template.files.map((f) => f.path)];
    const fileTree = renderFileTree(slug, allFiles);

    // Phase 1 & 2: Present plan
    const planResponse = [
      `${SKILL_ICONS.project}  coach:project`,
      "",
      `> ${input}`,
      "",
      `**Type detected:** ${projectType}`,
      `**Language:** ${lang}`,
      `**Name:** ${slug}`,
      "",
      "## Project Plan",
      "",
      "```",
      fileTree,
      "```",
      "",
      "### Files",
      ...template.files.map((f) => `- **${f.path}** — ${f.description}`),
      "",
    ].join("\n");

    // Phase 3: Generate files
    const projectDir = join(context.libraryPath, "projects", slug);

    // Create directories
    for (const dir of template.dirs) {
      await Deno.mkdir(join(projectDir, dir), { recursive: true });
    }
    await Deno.mkdir(projectDir, { recursive: true });

    const generatedFiles: string[] = [];

    // Generate README
    const readmeContent = generateReadme(input, slug, lang, projectType, fileTree);
    await Deno.writeTextFile(join(projectDir, "README.md"), readmeContent);
    generatedFiles.push("README.md");

    // Generate template files
    for (const file of template.files) {
      const content = generateFileContent(file.path, slug, lang, projectType);
      const filePath = join(projectDir, file.path);
      await Deno.mkdir(join(filePath, ".."), { recursive: true });
      await Deno.writeTextFile(filePath, content);
      generatedFiles.push(file.path);
    }

    // Phase 4: Wrap-up
    const durationS = Math.round((Date.now() - startTime) / 1000);

    // Register in DB
    const relativePath = `projects/${slug}/README.md`;
    const metadata = {
      title: input,
      tags: [projectType, lang, slug],
      created: new Date().toISOString().split("T")[0],
      source: "coach:project",
      lang,
    };
    indexItem(context.db, "project", metadata, relativePath);
    await regenerateDashboard(context.db, context.libraryPath);

    // Log session
    logSession(context.db, {
      mode: "project",
      lang,
      tags: [projectType, slug],
      query: input,
      duration_s: durationS,
    });

    // Build response
    const progressLines = generatedFiles.map(
      (f, i) => `  Creating file ${i + 1}/${generatedFiles.length}: ${f} ✓`,
    );

    const response = [
      planResponse,
      "## Implementation",
      "",
      ...progressLines,
      "",
      "---",
      "",
      `## ✅ Project Created: ${slug}`,
      "",
      `📁 Location: ${projectDir}`,
      `📄 Files: ${generatedFiles.length}`,
      "",
      "Run it with:",
      "```bash",
      `cd ${projectDir}`,
      projectType === "api" ? "deno task start" : "deno run main.ts",
      "```",
      "",
      "_This is a prompt template. In pi agent mode, the agent generates real file contents._",
    ].join("\n");

    return {
      response,
      lang,
      tags: [projectType, lang, slug],
    };
  },
};

function generateReadme(
  idea: string,
  slug: string,
  lang: string,
  projectType: string,
  fileTree: string,
): string {
  const metadata = {
    title: idea,
    tags: [projectType, lang, slug],
    created: new Date().toISOString().split("T")[0],
    source: "coach:project",
    lang,
  };

  const body = [
    `# ${idea}`,
    "",
    "> Built with Dev Coach 🎓",
    "",
    "## What it does",
    `_Describe what this ${projectType} does_`,
    "",
    "## How to run",
    "```bash",
    projectType === "api" ? "deno task start" : "deno run main.ts",
    "```",
    "",
    "## What you learned",
    "- _Topic 1_",
    "- _Topic 2_",
    "",
    "## Structure",
    "```",
    fileTree,
    "```",
  ].join("\n");

  return serializeFrontmatter(metadata, body);
}

function generateFileContent(
  filePath: string,
  slug: string,
  lang: string,
  projectType: string,
): string {
  if (filePath === "deno.json") {
    return JSON.stringify({
      tasks: {
        start: projectType === "api" ? "deno run --allow-net main.ts" : "deno run main.ts",
        dev: projectType === "api" ? "deno run --watch --allow-net main.ts" : "deno run --watch main.ts",
      },
    }, null, 2) + "\n";
  }

  if (filePath === ".gitignore") {
    return ".env\n*.db\n";
  }

  if (filePath === "main.ts") {
    if (projectType === "api") {
      return `// ${slug} — API server\nconsole.log("Server starting...");\n// TODO: Implement server\n`;
    }
    return `// ${slug} — entry point\nconsole.log("Hello from ${slug}!");\n// TODO: Implement\n`;
  }

  if (filePath === "mod.ts") {
    return `// ${slug} — library entry point\nexport {};\n`;
  }

  // Generic source file
  return `// ${filePath} — ${slug}\n// TODO: Implement\n`;
}
