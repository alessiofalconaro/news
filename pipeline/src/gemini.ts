/**
 * The Gemini client: one call at a time, spaced out, retried on the failures
 * that are worth retrying.
 *
 * The free tier is metered per minute, so two calls in quick succession are a
 * realistic way to get throttled. Everything here goes through `ask`, which
 * keeps the spacing on its own rather than trusting each caller to remember.
 */

import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { GEMINI_MODEL, MAX_AI_ATTEMPTS, PAUSE_BETWEEN_AI_CALLS_MS } from './config.ts';
import { sleep } from './time.ts';
import { detail, reason, warn } from './log.ts';

let client: GoogleGenAI | null = null;
let lastCallFinishedAt = 0;

export function initGemini(apiKey: string): void {
  client = new GoogleGenAI({ apiKey });
}

/** 429 and 5xx are worth another go; a 400 means the request itself is wrong. */
function worthRetrying(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (typeof status === 'number') return status === 429 || status >= 500;
  const text = reason(error);
  return /\b(429|5\d\d)\b/.test(text) || /rate limit|quota|unavailable|overloaded/i.test(text);
}

/** Strips the ``` fence some responses arrive wrapped in. */
function unwrap(text: string): string {
  const fenced = text.match(/^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$/);
  return (fenced?.[1] ?? text).trim();
}

/**
 * One prompt, one JSON answer, validated before it is handed back.
 *
 * `responseSchema` makes the model emit JSON of the right shape, and the Zod
 * parse is the belt to that pair of braces: a shape that still comes back wrong
 * should fail here, loudly, rather than three functions later as an undefined.
 */
export async function ask<T>(
  label: string,
  prompt: string,
  responseSchema: Record<string, unknown>,
  shape: z.ZodType<T>,
): Promise<T> {
  if (!client) throw new Error('initGemini was never called');

  const since = Date.now() - lastCallFinishedAt;
  if (lastCallFinishedAt && since < PAUSE_BETWEEN_AI_CALLS_MS) {
    await sleep(PAUSE_BETWEEN_AI_CALLS_MS - since);
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_AI_ATTEMPTS; attempt += 1) {
    try {
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema,
          // The task is judgement over supplied text, not invention.
          temperature: 0.2,
        },
      });
      lastCallFinishedAt = Date.now();
      const text = response.text;
      if (!text) throw new Error('risposta vuota');
      return shape.parse(JSON.parse(unwrap(text)));
    } catch (error) {
      lastError = error;
      lastCallFinishedAt = Date.now();
      if (attempt === MAX_AI_ATTEMPTS || !worthRetrying(error)) break;
      const wait = PAUSE_BETWEEN_AI_CALLS_MS * attempt * 2;
      warn(
        `${label}: tentativo ${attempt} fallito (${reason(error)}), riprovo tra ${wait / 1000}s`,
      );
      await sleep(wait);
    }
  }
  throw new Error(`${label}: ${reason(lastError)}`);
}

export function describeModel(): void {
  detail(`modello ${GEMINI_MODEL}, una chiamata ogni ${PAUSE_BETWEEN_AI_CALLS_MS / 1000}s`);
}
