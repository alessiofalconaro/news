/**
 * Translates a topic's name, on demand, for the app.
 *
 * The app cannot do this itself: the Gemini key would have to be in the page,
 * and anything in the page is downloadable by anyone who opens the site. The
 * pipeline has the key but runs on a schedule, so going through it meant the
 * name stayed in the language it was typed in until the next round - fine for
 * a label nobody is looking at, wrong for one somebody has just typed while
 * reading in the other language.
 *
 * So: a worker that holds the key and answers one question, for signed-in
 * readers of this app only. Everything else about the topic still belongs to
 * the pipeline; this exists because a person is waiting.
 *
 * The caller proves who they are with their Firebase ID token, which is
 * verified here properly - signature, issuer, audience, expiry - and then used,
 * as itself, to ask Firestore whether that address is on the allow list. That
 * last step costs a round trip and is worth it: it means this endpoint enforces
 * exactly the same list as the rest of the app, with no second copy of it to
 * drift, and no credential of its own beyond the Gemini key.
 */

interface Env {
  GEMINI_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  /** Comma-separated origins allowed to call this. The app, and nothing else. */
  ALLOWED_ORIGINS: string;

  /** The wake-up call: which workflow to start, and the token to start it. */
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_REF: string;
  GITHUB_WORKFLOW: string;
}

const MODEL = 'gemini-3.5-flash-lite';

/** A topic name. Anything longer is not a name and will not be translated. */
const MAX_NAME = 80;

const JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

export default {
  /**
   * The wake-up call for the digest.
   *
   * GitHub's own scheduler turned out not to be one. Against a cron asking for
   * forty-eight runs a day it granted four - 00:44, 06:53, 11:14, 15:58 - with
   * delays of six to twenty minutes, which is documented behaviour for a
   * private repository on the free plan and quite reasonable of them: it is
   * free capacity offered when there is some. It is simply not a clock, and
   * the app was treating it as one. A round due at ten was built at a quarter
   * past eleven because nothing ran in between.
   *
   * Cloudflare's cron is a clock, so it holds the schedule and GitHub does the
   * work. Half-hourly, which is not an arbitrary choice: GitHub bills each run
   * rounded up to the minute, so forty-eight wake-ups a day cost about 1460 of
   * the 2000 free minutes, and the real builds another 270 or so. Every twenty
   * minutes would not fit.
   */
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    const url =
      `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}` +
      `/actions/workflows/${env.GITHUB_WORKFLOW}/dispatches`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.GITHUB_TOKEN}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        // GitHub refuses a request without one.
        'user-agent': 'newsdigest-translator',
        'content-type': 'application/json',
      },
      // No `force`: this is the ordinary wake-up, and the pipeline decides on
      // its own whether anybody has a round due. Forcing would rebuild every
      // account's digest every half hour.
      body: JSON.stringify({ ref: env.GITHUB_REF }),
    });

    if (!response.ok) {
      // Written to the Worker's log, where `wrangler tail` can see it. Nothing
      // to retry: another wake-up is half an hour away, and the round it would
      // have built stays due for two hours.
      console.log(`sveglia non riuscita: ${response.status} ${await response.text()}`);
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') ?? '';
    const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
    const cors = allowed.includes(origin) ? origin : '';

    if (request.method === 'OPTIONS') return preflight(cors);
    if (!cors) return json({ error: 'origin' }, 403, '');
    if (request.method !== 'POST') return json({ error: 'method' }, 405, cors);

    let name: string;
    try {
      const body = (await request.json()) as { name?: unknown };
      name = typeof body.name === 'string' ? body.name.trim() : '';
    } catch {
      return json({ error: 'body' }, 400, cors);
    }
    if (!name || name.length > MAX_NAME) return json({ error: 'name' }, 400, cors);

    const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const claims = await verifyIdToken(token, env.FIREBASE_PROJECT_ID);
    if (!claims) return json({ error: 'auth' }, 401, cors);
    if (!(await onAllowList(token, claims.email, env.FIREBASE_PROJECT_ID))) {
      return json({ error: 'allow' }, 403, cors);
    }

    try {
      return json(await translate(name, env.GEMINI_API_KEY), 200, cors);
    } catch {
      // The app falls back to showing what was typed, and the pipeline will
      // translate it at the next round anyway. Nothing here is load-bearing.
      return json({ error: 'gemini' }, 502, cors);
    }
  },
};

// --- The answer ------------------------------------------------------------

interface Names {
  it: string;
  en: string;
  meaningful: boolean;
}

/**
 * Deliberately the same instructions as the pipeline's, in the same words.
 *
 * Two prompts for one job would drift, and then a name would change slightly
 * the first time the pipeline saw it again - which reads as a bug even though
 * both answers are fine.
 */
async function translate(name: string, key: string): Promise<Names> {
  const prompt = `Dai il nome di un topic di un'app di notizie in italiano e in inglese.

NOME SCRITTO DALL'UTENTE: ${name}

REGOLE
- E' un'etichetta di una o poche parole, non una frase: la resa deve essere
  altrettanto breve e suonare naturale a un lettore di quella lingua, non
  tradotta parola per parola.
- Nomi propri, sigle e marchi restano identici: NBA resta NBA in entrambe,
  "Formula 1" resta "Formula 1", "Taylor Swift" resta "Taylor Swift".
- Se il nome e' gia' nella lingua d'arrivo, riportalo identico.
- Niente virgolette, niente punto finale, niente spiegazioni.
- "meaningful" e' false SOLO quando il testo non e' una parola o un'espressione
  di nessuna lingua - "asdfgh", "xyz123", tasti premuti a caso. Un nome strano
  ma leggibile, o in una terza lingua, e' meaningful: traducilo.
- Quando "meaningful" e' false, riporta il testo identico in entrambi i campi.

ESEMPI
- "Geopolitica mondiale" -> it "Geopolitica mondiale", en "World geopolitics"
- "Tech and AI" -> it "Tecnologia e IA", en "Tech and AI"
- "NBA" -> it "NBA", en "NBA"
- "asdfgh" -> meaningful false, it "asdfgh", en "asdfgh"`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              meaningful: { type: 'boolean' },
              it: { type: 'string' },
              en: { type: 'string' },
            },
            required: ['meaningful', 'it', 'en'],
          },
        },
      }),
    },
  );
  if (!response.ok) throw new Error(`gemini ${response.status}`);

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const parsed = JSON.parse(text) as Partial<Names>;

  // Whatever comes back, the reply is a name in two languages: a field missing
  // or empty falls back to what was typed rather than blanking the topic.
  return {
    it: typeof parsed.it === 'string' && parsed.it.trim() ? parsed.it.trim() : name,
    en: typeof parsed.en === 'string' && parsed.en.trim() ? parsed.en.trim() : name,
    meaningful: parsed.meaningful !== false,
  };
}

// --- Who is asking ---------------------------------------------------------

interface Claims {
  email: string;
  uid: string;
}

let keyCache: { keys: Record<string, CryptoKey>; until: number } | null = null;

/** Google rotates these; the response says for how long it is good. */
async function publicKeys(): Promise<Record<string, CryptoKey>> {
  if (keyCache && keyCache.until > Date.now()) return keyCache.keys;

  const response = await fetch(JWKS_URL);
  const { keys } = (await response.json()) as { keys: JsonWebKey[] };

  const imported: Record<string, CryptoKey> = {};
  for (const jwk of keys) {
    const kid = (jwk as { kid?: string }).kid;
    if (!kid) continue;
    imported[kid] = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
  }

  const maxAge = /max-age=(\d+)/.exec(response.headers.get('cache-control') ?? '')?.[1];
  keyCache = { keys: imported, until: Date.now() + Number(maxAge ?? 3600) * 1000 };
  return imported;
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '='));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/**
 * A Firebase ID token for this project, checked the way Google documents it.
 *
 * Signature first, then the claims: a token signed by somebody else is not a
 * token, and one issued for another project is somebody else's user.
 */
async function verifyIdToken(token: string, projectId: string): Promise<Claims | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [rawHeader, rawPayload, rawSignature] = parts as [string, string, string];

  try {
    const header = JSON.parse(new TextDecoder().decode(fromBase64Url(rawHeader))) as {
      alg?: string;
      kid?: string;
    };
    if (header.alg !== 'RS256' || !header.kid) return null;

    const key = (await publicKeys())[header.kid];
    if (!key) return null;

    const signed = new TextEncoder().encode(`${rawHeader}.${rawPayload}`);
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      fromBase64Url(rawSignature),
      signed,
    );
    if (!valid) return null;

    const claims = JSON.parse(new TextDecoder().decode(fromBase64Url(rawPayload))) as {
      iss?: string;
      aud?: string;
      exp?: number;
      sub?: string;
      email?: string;
      email_verified?: boolean;
    };

    const now = Math.floor(Date.now() / 1000);
    if (claims.aud !== projectId) return null;
    if (claims.iss !== `https://securetoken.google.com/${projectId}`) return null;
    if (!claims.exp || claims.exp <= now) return null;
    if (!claims.sub || !claims.email || claims.email_verified !== true) return null;

    return { uid: claims.sub, email: claims.email.toLowerCase() };
  } catch {
    return null;
  }
}

/**
 * Whether that address is invited, asked of Firestore as the caller.
 *
 * The rules already say a signed-in account may read its own row of
 * `allowedEmails` and nothing else, so handing the caller's own token straight
 * back to Firestore answers the question without this worker holding any
 * privilege of its own. If the rules change, this follows, because it is the
 * rules doing the work.
 */
async function onAllowList(token: string, email: string, projectId: string): Promise<boolean> {
  const url =
    `https://firestore.googleapis.com/v1/projects/${projectId}` +
    `/databases/(default)/documents/allowedEmails/${encodeURIComponent(email)}`;
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  return response.ok;
}

// --- Plumbing --------------------------------------------------------------

function headers(origin: string): Record<string, string> {
  return {
    'content-type': 'application/json',
    ...(origin
      ? {
          'access-control-allow-origin': origin,
          'access-control-allow-headers': 'authorization,content-type',
          'access-control-allow-methods': 'POST,OPTIONS',
          'access-control-max-age': '86400',
          vary: 'Origin',
        }
      : {}),
  };
}

function preflight(origin: string): Response {
  return new Response(null, { status: origin ? 204 : 403, headers: headers(origin) });
}

function json(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), { status, headers: headers(origin) });
}
