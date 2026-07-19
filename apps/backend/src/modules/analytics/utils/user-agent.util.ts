export interface ParsedUserAgent {
  /** 'mobile' | 'tablet' | 'desktop' | 'bot', or null when UA is absent. */
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  /** True for crawlers / automated clients (incl. AI crawlers like GPTBot). */
  isBot: boolean;
}

const EMPTY: ParsedUserAgent = {
  deviceType: null,
  browser: null,
  os: null,
  isBot: false,
};

// Automated clients. Note this catches AI *crawlers* (GPTBot, ClaudeBot, CCBot,
// Google-Extended…) — distinct from AI *referral* traffic, which is a human on a
// real browser arriving from chatgpt.com/claude.ai and is classified by channel,
// not here.
const BOT_RE =
  /bot\b|crawler|spider|crawling|slurp|mediapartners|bingpreview|facebookexternalhit|whatsapp|telegram|headlesschrome|phantomjs|python-requests|aiohttp|axios|curl|wget|libwww|node-fetch|go-http-client|okhttp|java\/|scrapy|semrush|ahrefs|mj12|dotbot|petalbot|gptbot|claudebot|anthropic|ccbot|google-extended|amazonbot|bytespider|applebot|yandex|baiduspider|duckduckbot/i;

const TABLET_RE = /ipad|tablet|playbook|silk|kindle|(android(?!.*mobile))/i;
const MOBILE_RE =
  /mobile|iphone|ipod|android|blackberry|bb10|iemobile|opera mini|windows phone/i;

/**
 * Lightweight, dependency-free User-Agent classifier. Coarse by design — we only
 * need device_type / browser / os for analytics buckets, not exhaustive version
 * detection. (Swap in `ua-parser-js` later if richer coverage is wanted.)
 */
export function parseUserAgent(ua: string | undefined | null): ParsedUserAgent {
  if (!ua) return EMPTY;

  if (BOT_RE.test(ua)) {
    return { deviceType: 'bot', browser: null, os: parseOs(ua), isBot: true };
  }

  const deviceType = TABLET_RE.test(ua)
    ? 'tablet'
    : MOBILE_RE.test(ua)
      ? 'mobile'
      : 'desktop';

  return {
    deviceType,
    browser: parseBrowser(ua),
    os: parseOs(ua),
    isBot: false,
  };
}

// Order matters: Edge/Opera UAs contain "Chrome"; Chrome contains "Safari".
function parseBrowser(ua: string): string {
  if (/edg(a|ios|e)?\//i.test(ua)) return 'Edge';
  if (/opr\/|opera/i.test(ua)) return 'Opera';
  if (/samsungbrowser/i.test(ua)) return 'Samsung Internet';
  if (/firefox\/|fxios\//i.test(ua)) return 'Firefox';
  if (/chrome\/|crios\//i.test(ua)) return 'Chrome';
  if (/safari\//i.test(ua)) return 'Safari';
  return 'Other';
}

// Order matters: Android contains "Linux"; iOS contains "like Mac OS X".
function parseOs(ua: string): string {
  if (/windows nt/i.test(ua)) return 'Windows';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/mac os x|macintosh/i.test(ua)) return 'macOS';
  if (/cros/i.test(ua)) return 'ChromeOS';
  if (/linux|x11/i.test(ua)) return 'Linux';
  return 'Other';
}
