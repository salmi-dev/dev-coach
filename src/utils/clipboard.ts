/**
 * OS-aware clipboard integration.
 */

import { getOS } from './platform.ts';
import { runtime } from './runtime/index.ts';

type ClipboardTool = 'pbcopy' | 'wl-copy' | 'xclip' | 'xsel' | 'clip';

/** Detect which clipboard tool is available. Returns null if none found. */
export async function detectClipboardTool(): Promise<ClipboardTool | null> {
  const os = getOS();

  if (os === 'macos') {
    if (await commandExists('pbcopy')) return 'pbcopy';
  } else if (os === 'linux') {
    // Wayland first, then X11
    if (runtime.env.get('WAYLAND_DISPLAY') && (await commandExists('wl-copy'))) {
      return 'wl-copy';
    }
    if (await commandExists('xclip')) return 'xclip';
    if (await commandExists('xsel')) return 'xsel';
  } else if (os === 'windows') {
    return 'clip'; // Always available on Windows
  }

  return null;
}

/** Copy text to the system clipboard. Returns true on success, false if no tool available. */
export async function copyToClipboard(text: string): Promise<boolean> {
  const tool = await detectClipboardTool();
  if (!tool) return false;

  try {
    let cmd: string[];
    switch (tool) {
      case 'pbcopy':
        cmd = ['pbcopy'];
        break;
      case 'wl-copy':
        cmd = ['wl-copy'];
        break;
      case 'xclip':
        cmd = ['xclip', '-selection', 'clipboard'];
        break;
      case 'xsel':
        cmd = ['xsel', '--clipboard', '--input'];
        break;
      case 'clip':
        cmd = ['clip'];
        break;
    }

    const result = await runtime.runCommand(cmd[0], cmd.slice(1), { stdin: text });
    return result.code === 0;
  } catch {
    return false;
  }
}

/** Check if a command exists on the system. */
async function commandExists(cmd: string): Promise<boolean> {
  try {
    const which = getOS() === 'windows' ? 'where' : 'which';
    const result = await runtime.runCommand(which, [cmd]);
    return result.code === 0;
  } catch {
    return false;
  }
}
