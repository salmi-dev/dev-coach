/**
 * XDG Base Directory resolution.
 * Follows XDG spec on Linux, uses same conventions on macOS,
 * falls back to %APPDATA%/%LOCALAPPDATA% on Windows.
 */

import { join } from "@std/path";
import { getOS, getHomeDir } from "./platform.ts";

const APP_NAME = "dev-coach";

/** Expand ~ to home directory. */
export function expandTilde(path: string): string {
  if (path === "~" || path.startsWith("~/")) {
    return join(getHomeDir(), path.slice(1));
  }
  return path;
}

/** Get the config directory: $XDG_CONFIG_HOME/dev-coach/ */
export function getConfigDir(): string {
  const xdg = Deno.env.get("XDG_CONFIG_HOME");
  if (xdg) return join(xdg, APP_NAME);

  const os = getOS();
  if (os === "windows") {
    const appData = Deno.env.get("APPDATA");
    if (appData) return join(appData, APP_NAME);
  }

  return join(getHomeDir(), ".config", APP_NAME);
}

/** Get the data directory: $XDG_DATA_HOME/dev-coach/ */
export function getDataDir(): string {
  const xdg = Deno.env.get("XDG_DATA_HOME");
  if (xdg) return join(xdg, APP_NAME);

  const os = getOS();
  if (os === "windows") {
    const localAppData = Deno.env.get("LOCALAPPDATA");
    if (localAppData) return join(localAppData, APP_NAME);
  }

  return join(getHomeDir(), ".local", "share", APP_NAME);
}

/** Get the library path from config, with tilde expansion. Default: ~/dev-coach */
export function getLibraryPath(libraryPath?: string): string {
  const path = libraryPath || "~/dev-coach";
  return expandTilde(path);
}
