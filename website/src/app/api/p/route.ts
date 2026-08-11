/**
 * route.ts — the analytics collector: POST /api/p
 *
 * Adapted from Ledga's tracking Lambda (ChicagoDave/budgetman
 * lambda/src/analytics-track.js), which ran on API Gateway → Lambda →
 * DynamoDB. sharpee.net already IS a server — a Next app behind Apache on
 * plover — so the same design collapses into one route handler and an
 * append-only file. No AWS, no table, nothing to provision.
 *
 * Two deliberate departures from the source:
 *
 *   1. JSONL on disk rather than DynamoDB. A native SQLite module is one more
 *      thing that can fail during `npm ci` on deploy, and a line-per-event
 *      file imports into SQLite in one command the day real queries are
 *      wanted. Monthly files keep any single one small.
 *   2. The IP is HASHED, never stored. Ledga keeps raw IPs for 90 days under a
 *      published privacy policy; sharpee.net has no such policy, so it keeps
 *      what a raw IP was actually for — deduplication and coarse geography —
 *      and discards the identifier. The salt rotates daily, so yesterday's
 *      hashes cannot be joined to today's.
 *
 * Never throws and always answers 200: a visitor's console is not the place to
 * learn that our analytics disk is full.
 *
 * Public interface: POST (the beacon), OPTIONS (CORS preflight).
 * Owner context: website — analytics collection.
 */
import { createHash, randomBytes } from 'node:crypto';
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Where events land. Outside the repo so a deploy's `git pull` cannot touch them. */
const DATA_DIR = process.env.SHARPEE_ANALYTICS_DIR ?? '/var/lib/sharpee-analytics';

/**
 * Per-process salt for IP hashing, combined with the date so the hash rotates
 * daily. Random per boot as well, which means a restart also breaks the chain —
 * acceptable, because the hash exists to group a single day's visits, not to
 * follow anyone across time.
 */
const SALT = process.env.SHARPEE_ANALYTICS_SALT ?? randomBytes(16).toString('hex');

const BOT_PATTERNS = [
  /bot/i, /crawler/i, /spider/i, /scraper/i,
  /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i,
  /facebookexternalhit/i, /twitterbot/i, /linkedinbot/i,
  /semrushbot/i, /ahrefsbot/i, /mj12bot/i,
  /headless/i, /phantom/i, /selenium/i, /puppeteer/i,
  /curl/i, /wget/i, /python-requests/i,
];

function isBot(ua: string): boolean {
  return ua !== '' && BOT_PATTERNS.some((p) => p.test(ua));
}

/** Browser / OS / device from the User-Agent, server-side (the client cannot be trusted to say). */
function parseUserAgent(ua: string) {
  let browser = 'unknown';
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR/')) browser = 'Opera';

  let os = 'unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  let device = 'desktop';
  if (ua.includes('Mobile') || ua.includes('Android')) device = 'mobile';
  else if (ua.includes('iPad') || ua.includes('Tablet')) device = 'tablet';

  // macOS on Apple silicon is the Chord Writer requirement, and a browser will
  // not tell us the architecture — but it is worth knowing how many visitors
  // are even on a Mac when reading download numbers.
  return { browser, os, device };
}

/** The client's address, through Apache's proxy headers. */
function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? '';
}

function hashIp(ip: string, day: string): string | null {
  if (ip === '') return null;
  return createHash('sha256').update(`${SALT}|${day}|${ip}`).digest('hex').slice(0, 16);
}

/** Cap a client-supplied string: nothing from a POST body sets its own length. */
function str(value: unknown, max = 300): string | null {
  return typeof value === 'string' && value !== '' ? value.slice(0, max) : null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : null;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  try {
    const ua = req.headers.get('user-agent') ?? '';
    if (isBot(ua)) {
      return Response.json({ ok: true, skipped: 'bot' }, { headers: CORS });
    }

    const body: Record<string, unknown> = await req.json().catch(() => ({}));
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const { browser, os, device } = parseUserAgent(ua);

    const event = {
      ts: now.toISOString(),
      day,
      type: str(body.type, 40) ?? 'pageview',
      // 'download' events carry which artifact was clicked.
      asset: str(body.asset, 200),

      vid: str(body.vid, 60),          // visitor, localStorage — persists
      sid: str(body.sid, 60),          // session, sessionStorage — per visit

      path: str(body.path),
      ref: str(body.ref, 400),
      lang: str(body.lang, 20),
      tz: str(body.tz, 60),
      sw: num(body.sw), sh: num(body.sh),
      vw: num(body.vw), vh: num(body.vh),

      browser, os, device,
      iph: hashIp(clientIp(req), day),
    };

    await mkdir(DATA_DIR, { recursive: true });
    await appendFile(
      join(DATA_DIR, `events-${day.slice(0, 7)}.jsonl`),
      `${JSON.stringify(event)}\n`,
      'utf-8',
    );

    return Response.json({ ok: true }, { headers: CORS });
  } catch {
    // Swallowed on purpose — see the header. A failed write must never surface
    // to a reader of the site.
    return Response.json({ ok: false }, { headers: CORS });
  }
}
