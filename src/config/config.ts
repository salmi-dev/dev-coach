/**
 * Config loading, saving, and validation.
 */

import { parse as parseYaml, stringify as stringifyYaml } from "@std/yaml";
import { dirname } from "@std/path";
import { join } from "@std/path";
import { getConfigDir } from "../utils/xdg.ts";
import { CoachConfig, DEFAULT_CONFIG, validateConfigFields } from "./schema.ts";

const CONFIG_FILENAME = "config.yaml";

/** Get the full path to the config file. */
export function getConfigPath(overridePath?: string): string {
  if (overridePath) return overridePath;
  return join(getConfigDir(), CONFIG_FILENAME);
}

/** Load config from YAML file. Returns defaults if file doesn't exist. */
export async function loadConfig(overridePath?: string): Promise<CoachConfig> {
  const path = getConfigPath(overridePath);

  try {
    const content = await Deno.readTextFile(path);
    const parsed = parseYaml(content) as Partial<CoachConfig> | null;

    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_CONFIG };
    }

    // Merge with defaults
    const config: CoachConfig = {
      ...DEFAULT_CONFIG,
      ...parsed,
      os: Deno.build.os, // always auto-detect
    };

    // Validate
    const error = validateConfig(config);
    if (error) {
      throw new Error(`Config validation error: ${error}`);
    }

    return config;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return { ...DEFAULT_CONFIG };
    }
    throw e;
  }
}

/** Save config to YAML file. Creates parent directories if needed. */
export async function saveConfig(config: CoachConfig, overridePath?: string): Promise<void> {
  const path = getConfigPath(overridePath);

  // Don't write os field — it's auto-detected
  const { os: _os, ...writableConfig } = config;

  const yaml = stringifyYaml(writableConfig as Record<string, unknown>);
  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.writeTextFile(path, yaml);
}

/** Validate a config object. Returns error message or null. */
export function validateConfig(config: CoachConfig): string | null {
  return validateConfigFields(config);
}
