/**
 * Config schema and defaults for Dev Coach.
 */

export type ResponseStyle = "concise" | "detailed" | "examples-first";

export interface CoachConfig {
  /** Path to user's library (snippets, tldrs, projects). Default: ~/dev-coach */
  library_path: string;
  /** User's primary programming languages. */
  primary_languages: string[];
  /** Frameworks and tools the user works with. */
  frameworks: string[];
  /** Preferred response style. */
  response_style: ResponseStyle;
  /** Auto-detected OS. Not user-editable. */
  os: string;
}

export const VALID_RESPONSE_STYLES: ResponseStyle[] = ["concise", "detailed", "examples-first"];

export const DEFAULT_CONFIG: CoachConfig = {
  library_path: "~/dev-coach",
  primary_languages: [],
  frameworks: [],
  response_style: "concise",
  os: Deno.build.os,
};

/** Validate a partial config object. Returns error message or null. */
export function validateConfigFields(config: Partial<CoachConfig>): string | null {
  if (
    config.response_style !== undefined &&
    !VALID_RESPONSE_STYLES.includes(config.response_style as ResponseStyle)
  ) {
    return `Invalid response_style: "${config.response_style}". Must be one of: ${VALID_RESPONSE_STYLES.join(", ")}`;
  }
  if (config.primary_languages !== undefined && !Array.isArray(config.primary_languages)) {
    return `Invalid primary_languages: must be an array`;
  }
  if (config.frameworks !== undefined && !Array.isArray(config.frameworks)) {
    return `Invalid frameworks: must be an array`;
  }
  if (config.library_path !== undefined && typeof config.library_path !== "string") {
    return `Invalid library_path: must be a string`;
  }
  return null;
}
