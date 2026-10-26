/**
 * Runtime environment configuration.
 *
 * Validation is a pure function so it can be unit tested without Vite, and so a
 * misconfigured deployment fails loudly at startup instead of silently behaving as if a
 * value were absent.
 *
 * Security: only `VITE_`-prefixed values reach the browser. They are embedded in the
 * client bundle and are therefore public. Provider credentials must never live here
 * (design spec 26).
 */

export type AppMode = 'development' | 'test' | 'production';

export interface AppEnvironment {
  readonly mode: AppMode;
  /** Absolute http(s) base URL for the backend API, or `null` when running frontend-only. */
  readonly apiBaseUrl: string | null;
  /** The Adult provider is opt-in and disabled unless explicitly enabled (design spec 13). */
  readonly adultProviderEnabled: boolean;
}

export interface RawEnvironment {
  readonly MODE?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ENABLE_ADULT_PROVIDER?: string;
}

export class EnvironmentConfigurationError extends Error {
  readonly variable: string;

  constructor(variable: string, message: string) {
    super(message);
    this.name = 'EnvironmentConfigurationError';
    this.variable = variable;
  }
}

const APP_MODES: readonly AppMode[] = ['development', 'test', 'production'];

function parseAppMode(value: string | undefined): AppMode {
  if (value === undefined || value.trim().length === 0) {
    return 'development';
  }

  const normalized = value.trim().toLowerCase();
  const match = APP_MODES.find((mode) => mode === normalized);

  if (match === undefined) {
    throw new EnvironmentConfigurationError(
      'MODE',
      `Invalid MODE ${JSON.stringify(value)}: expected one of ${APP_MODES.join(', ')}.`,
    );
  }

  return match;
}

function parseApiBaseUrl(value: string | undefined): string | null {
  if (value === undefined || value.trim().length === 0) {
    return null;
  }

  const candidate = value.trim();
  let parsed: URL;

  try {
    parsed = new URL(candidate);
  } catch {
    throw new EnvironmentConfigurationError(
      'VITE_API_BASE_URL',
      `Invalid VITE_API_BASE_URL ${JSON.stringify(value)}: expected an absolute http(s) URL.`,
    );
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new EnvironmentConfigurationError(
      'VITE_API_BASE_URL',
      `Invalid VITE_API_BASE_URL ${JSON.stringify(value)}: only http and https are supported.`,
    );
  }

  return parsed.toString().replace(/\/$/, '');
}

const TRUTHY = ['true', '1', 'yes'];
const FALSY = ['', 'false', '0', 'no'];

function parseBooleanFlag(variableName: string, value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }

  const normalized = value.trim().toLowerCase();

  if (TRUTHY.includes(normalized)) {
    return true;
  }

  if (FALSY.includes(normalized)) {
    return false;
  }

  // Rejecting unknown values prevents a typo from silently disabling a safety control.
  throw new EnvironmentConfigurationError(
    variableName,
    `Invalid ${variableName} ${JSON.stringify(value)}: expected one of ${[...TRUTHY, ...FALSY.filter(Boolean)].join(', ')}.`,
  );
}

export function parseAppEnvironment(raw: RawEnvironment): AppEnvironment {
  return {
    mode: parseAppMode(raw.MODE),
    apiBaseUrl: parseApiBaseUrl(raw.VITE_API_BASE_URL),
    adultProviderEnabled: parseBooleanFlag(
      'VITE_ENABLE_ADULT_PROVIDER',
      raw.VITE_ENABLE_ADULT_PROVIDER,
    ),
  };
}

function readViteEnvironment(): RawEnvironment {
  const env = import.meta.env;

  return {
    MODE: env.MODE,
    VITE_API_BASE_URL: env.VITE_API_BASE_URL,
    VITE_ENABLE_ADULT_PROVIDER: env.VITE_ENABLE_ADULT_PROVIDER,
  };
}

/** Validated configuration for the running application. */
export const appEnvironment: AppEnvironment = parseAppEnvironment(readViteEnvironment());
