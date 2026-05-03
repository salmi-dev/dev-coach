/**
 * Platform detection utilities.
 */

/** Operating-system tags used internally. */
export type OS = 'macos' | 'linux' | 'windows';

/** Detect the current operating system. */
export function getOS(): OS {
  switch (Deno.build.os) {
    case 'darwin':
      return 'macos';
    case 'linux':
      return 'linux';
    case 'windows':
      return 'windows';
    default:
      return 'linux'; // fallback
  }
}

/** Get the user's home directory. */
export function getHomeDir(): string {
  const os = getOS();
  if (os === 'windows') {
    const userProfile = Deno.env.get('USERPROFILE');
    if (userProfile) return userProfile;
  }
  const home = Deno.env.get('HOME');
  if (home) return home;
  throw new Error('Unable to determine home directory: neither HOME nor USERPROFILE is set');
}

/** Check whether stdin is an interactive TTY. */
export function isInteractive(): boolean {
  try {
    return Deno.stdin.isTerminal();
  } catch {
    return false;
  }
}
