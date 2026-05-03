/**
 * coach init — Interactive first-run setup.
 */

import { parseArgs } from "@std/cli/parse-args";
import { join } from "@std/path";
import { loadConfig, saveConfig, getConfigPath } from "../config/config.ts";
import { getDb, closeDb } from "../db/connection.ts";
import { getLibraryPath } from "../utils/xdg.ts";
import { isInteractive } from "../utils/platform.ts";
import { renderWelcomeBanner, renderBox } from "../utils/ascii.ts";
import { CoachConfig, DEFAULT_CONFIG, VALID_RESPONSE_STYLES, ResponseStyle } from "../config/schema.ts";

const COMMON_LANGUAGES = [
  "typescript", "javascript", "rust", "python", "go",
  "java", "shell", "c", "cpp", "ruby", "kotlin", "swift",
];

/** Run the init command. */
export async function runInit(args: string[], configOverride?: string): Promise<void> {
  const parsed = parseArgs(args, { boolean: ["force"] });
  const force = parsed.force;

  // Welcome banner
  console.log(renderWelcomeBanner());
  console.log();

  // Re-init guard
  const configPath = getConfigPath(configOverride);
  if (!force) {
    try {
      await Deno.stat(configPath);
      // Config exists
      console.log("⚠️  Config already exists at:", configPath);
      const answer = await prompt("Overwrite? [y/N] ");
      if (answer?.toLowerCase() !== "y") {
        console.log("Aborted.");
        return;
      }
    } catch (e) {
      if (!(e instanceof Deno.errors.NotFound)) throw e;
      // No config — proceed
    }
  }

  let config: CoachConfig;

  if (isInteractive()) {
    config = await interactiveSetup();
  } else {
    // Non-interactive: use defaults
    config = { ...DEFAULT_CONFIG };
  }

  // Save config
  await saveConfig(config, configOverride);
  console.log(`\n✅ Config written to ${configPath}`);

  // Create database (triggers migrations)
  const db = getDb();
  closeDb();
  console.log("✅ Database created");

  // Scaffold library directories
  const libraryPath = getLibraryPath(config.library_path);
  const dirs = ["snippets", "tldr", "projects"];
  for (const dir of dirs) {
    await Deno.mkdir(join(libraryPath, dir), { recursive: true });
  }
  console.log(`✅ Library initialized at ${libraryPath}`);

  // Write initial README dashboard
  await writeInitialDashboard(libraryPath);
  console.log("✅ Dashboard README created");

  // Summary
  console.log();
  console.log(
    renderBox("🎓 Setup Complete!", [
      "",
      `  Config:   ${configPath}`,
      `  Library:  ${libraryPath}`,
      "",
      "  Try: coach ask \"how do I ...\"",
      "",
    ]),
  );
}

/** Interactive prompts for setup. */
async function interactiveSetup(): Promise<CoachConfig> {
  console.log("Select your primary languages (comma-separated numbers):");
  COMMON_LANGUAGES.forEach((lang, i) => console.log(`  ${i + 1}. ${lang}`));
  console.log(`  ${COMMON_LANGUAGES.length + 1}. Other (type manually)`);

  const langInput = await prompt("\nLanguages [e.g., 1,2,6]: ");
  const languages = parseLangSelection(langInput || "");

  const fwInput = await prompt("\nFrameworks/tools (comma-separated): ");
  const frameworks = (fwInput || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log("\nResponse style:");
  VALID_RESPONSE_STYLES.forEach((style, i) => console.log(`  ${i + 1}. ${style}`));
  const styleInput = await prompt("\nStyle [1]: ");
  const styleIdx = parseInt(styleInput || "1") - 1;
  const responseStyle: ResponseStyle =
    VALID_RESPONSE_STYLES[styleIdx] || "concise";

  const libInput = await prompt("\nLibrary path [~/dev-coach]: ");
  const libraryPath = libInput?.trim() || "~/dev-coach";

  return {
    library_path: libraryPath,
    primary_languages: languages,
    frameworks,
    response_style: responseStyle,
    os: Deno.build.os,
  };
}

/** Parse language selection from numbered input. */
function parseLangSelection(input: string): string[] {
  const parts = input.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  const languages: string[] = [];

  for (const part of parts) {
    const num = parseInt(part);
    if (!isNaN(num) && num >= 1 && num <= COMMON_LANGUAGES.length) {
      languages.push(COMMON_LANGUAGES[num - 1]);
    } else if (isNaN(num)) {
      // Treat as manual language name
      languages.push(part.toLowerCase());
    }
  }

  return languages;
}

/** Read a line from stdin. */
function prompt(message: string): Promise<string | null> {
  const buf = new Uint8Array(1024);
  Deno.stdout.writeSync(new TextEncoder().encode(message));
  const n = Deno.stdin.readSync(buf);
  if (n === null) return Promise.resolve(null);
  return Promise.resolve(new TextDecoder().decode(buf.subarray(0, n)).trim());
}

/** Write the initial README.md dashboard to the library root. */
async function writeInitialDashboard(libraryPath: string): Promise<void> {
  const readme = `# 🎓 Dev Coach — My Knowledge Base

## 📊 Stats
- Total sessions: 0
- Snippets: 0 | TLDRs: 0 | Projects: 0

## 📝 Recent Snippets
_No snippets yet. Try \`coach sandbox "topic"\` to start collecting!_

## 📖 TLDRs
_No TLDRs yet. Try \`coach ask "question"\` and save the answer!_

## 🏗️ Projects
_No projects yet. Try \`coach project "idea"\` to build something!_

---
_Generated by Dev Coach. Updated automatically._
`;
  await Deno.writeTextFile(join(libraryPath, "README.md"), readme);
}
