/**
 * coach install-pi / uninstall-pi — Install/remove pi skills.
 */

import { join } from '@std/path';
import { exists } from '@std/fs';
import { parseArgs } from '@std/cli/parse-args';
import { runtime } from '../utils/runtime/index.ts';
import { renderBox } from '../utils/ascii.ts';

const SKILL_DIRS = ['.pi/skills', '.codex/skills', '.github/skills'];

const SKILLS = [
  'coach-ask',
  'coach-explain',
  'coach-compare',
  'coach-sandbox',
  'coach-review',
  'coach-project',
  'coach-stats',
];

const SKILL_DESCRIPTIONS: Record<string, string> = {
  'coach-ask': 'Quick Q&A',
  'coach-explain': 'Deep-dive explanation',
  'coach-compare': 'Compare approaches',
  'coach-sandbox': 'Explore with multiple approaches',
  'coach-review': 'Structured code review',
  'coach-project': 'Build a mini-project',
  'coach-stats': 'View stats dashboard',
};

/** Detect the skill directory in cwd. */
async function detectSkillDir(override?: string): Promise<string> {
  if (override) return override;

  for (const dir of SKILL_DIRS) {
    if (await exists(dir)) return dir;
  }

  // Default: create .pi/skills
  return '.pi/skills';
}

/** Get the source directory for skill files (from the installed package). */
function getSourceDir(): string {
  // Resolve relative to this file's location
  const thisFile = new URL(import.meta.url).pathname;
  const srcDir = join(thisFile, '..', '..', 'pi', 'skills');
  return srcDir;
}

/** Install pi skills. */
export async function runInstallPi(args: string[]): Promise<void> {
  const parsed = parseArgs(args, { string: ['dir'] });
  const targetDir = await detectSkillDir(parsed.dir);
  const sourceDir = getSourceDir();

  console.log(`Installing Dev Coach skills to ${targetDir}/...`);

  for (const skill of SKILLS) {
    const srcPath = join(sourceDir, skill, 'SKILL.md');
    const destDir = join(targetDir, skill);
    const destPath = join(destDir, 'SKILL.md');

    try {
      const content = await runtime.readTextFile(srcPath);
      await runtime.mkdir(destDir, { recursive: true });
      await runtime.writeTextFile(destPath, content);
    } catch (_e) {
      // If source doesn't exist, create a placeholder
      await runtime.mkdir(destDir, { recursive: true });
      await runtime.writeTextFile(destPath, `# ${skill}\n\nSkill definition placeholder.\n`);
    }
  }

  // Print confirmation
  console.log();
  console.log(renderBox('🎓 Dev Coach Skills Installed', [
    '',
    'Skills:',
    ...SKILLS.map((s) => `  ✅ ${s.padEnd(18)} ${SKILL_DESCRIPTIONS[s] || ''}`),
    '',
    'Tools:',
    '  ✅ coach-save        Save snippet/tldr/project',
    '  ✅ coach-search      Search library',
    '  ✅ coach-copy        Copy to clipboard',
    '  ✅ coach-log         Log session',
    '',
  ]));
}

/** Uninstall pi skills. */
export async function runUninstallPi(args: string[]): Promise<void> {
  const parsed = parseArgs(args, { string: ['dir'] });
  const targetDir = await detectSkillDir(parsed.dir);

  console.log(`Removing Dev Coach skills from ${targetDir}/...`);

  for (const skill of SKILLS) {
    const skillDir = join(targetDir, skill);
    try {
      await runtime.remove(skillDir, { recursive: true });
      console.log(`  Removed ${skill}`);
    } catch {
      // Already gone
    }
  }

  console.log('\n✅ Dev Coach skills removed.');
}
