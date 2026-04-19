/**
 * Loads the operator YAML config (if present) and overlays environment variables.
 *
 * Public interface: {@link loadConfig}, the {@link Config} shape.
 * Bounded context: server bootstrap (ADR-153 Decision 14, Decision 15).
 */

import { readFileSync, existsSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

export interface Config {
  server: {
    port: number;
  };
  storage: {
    dbPath: string;
    storiesDir: string;
  };
  rooms: {
    idleRecycleDays: number;
  };
  captcha: {
    provider: 'turnstile' | 'hcaptcha' | 'friendly' | 'none';
    siteKey: string;
    secretKey: string;
    bypass: boolean;
  };
  sandbox: {
    memoryMb: number;
    turnTimeoutMs: number;
  };
  logging: {
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  };
}

/** Default values when neither YAML nor env set a key. */
const DEFAULTS: Config = {
  server: { port: 8080 },
  storage: { dbPath: './data/sharpee.db', storiesDir: './data/stories' },
  rooms: { idleRecycleDays: 14 },
  captcha: { provider: 'none', siteKey: '', secretKey: '', bypass: false },
  sandbox: { memoryMb: 256, turnTimeoutMs: 5000 },
  logging: { level: 'info' },
};

/**
 * Load and merge configuration from (in precedence order, lowest to highest):
 *   1. built-in defaults
 *   2. YAML file at CONFIG_FILE or /etc/sharpee-platform.yaml
 *   3. environment variables (see .env.example)
 *
 * @returns frozen typed Config object
 * @throws if a required numeric env var fails to parse
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const cfg: Config = structuredClone(DEFAULTS);

  const yamlPath = env.CONFIG_FILE ?? '/etc/sharpee-platform.yaml';
  if (existsSync(yamlPath)) {
    const raw = parseYaml(readFileSync(yamlPath, 'utf8')) as Partial<Record<keyof Config, unknown>>;
    mergeYaml(cfg, raw);
  }

  if (env.PORT) cfg.server.port = parseIntOrThrow(env.PORT, 'PORT');
  if (env.DB_PATH) cfg.storage.dbPath = env.DB_PATH;
  if (env.STORIES_DIR) cfg.storage.storiesDir = env.STORIES_DIR;
  if (env.ROOMS_IDLE_RECYCLE_DAYS) {
    cfg.rooms.idleRecycleDays = parseIntOrThrow(env.ROOMS_IDLE_RECYCLE_DAYS, 'ROOMS_IDLE_RECYCLE_DAYS');
  }
  if (env.CAPTCHA_PROVIDER) cfg.captcha.provider = env.CAPTCHA_PROVIDER as Config['captcha']['provider'];
  if (env.CAPTCHA_SITE_KEY) cfg.captcha.siteKey = env.CAPTCHA_SITE_KEY;
  if (env.CAPTCHA_SECRET_KEY) cfg.captcha.secretKey = env.CAPTCHA_SECRET_KEY;
  if (env.CAPTCHA_BYPASS === '1') cfg.captcha.bypass = true;

  return Object.freeze(cfg);
}

function mergeYaml(dst: Config, src: Partial<Record<string, unknown>>): void {
  const s = src as any;
  if (s.server?.port != null) dst.server.port = Number(s.server.port);
  if (s.storage?.db_path) dst.storage.dbPath = String(s.storage.db_path);
  if (s.storage?.stories_dir) dst.storage.storiesDir = String(s.storage.stories_dir);
  if (s.rooms?.idle_recycle_days != null) dst.rooms.idleRecycleDays = Number(s.rooms.idle_recycle_days);
  if (s.captcha?.provider) dst.captcha.provider = s.captcha.provider;
  if (s.captcha?.site_key) dst.captcha.siteKey = String(s.captcha.site_key);
  if (s.captcha?.secret_key) dst.captcha.secretKey = String(s.captcha.secret_key);
  if (s.captcha?.bypass != null) dst.captcha.bypass = Boolean(s.captcha.bypass);
  if (s.sandbox?.memory_mb != null) dst.sandbox.memoryMb = Number(s.sandbox.memory_mb);
  if (s.sandbox?.turn_timeout_ms != null) dst.sandbox.turnTimeoutMs = Number(s.sandbox.turn_timeout_ms);
  if (s.logging?.level) dst.logging.level = s.logging.level;
}

function parseIntOrThrow(raw: string, name: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n)) throw new Error(`Config: ${name} must be an integer, got ${JSON.stringify(raw)}`);
  return n;
}
