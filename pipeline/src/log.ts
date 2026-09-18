/**
 * Logging. This output is read in the GitHub Actions console by someone who is
 * not looking for it - it only gets opened when something went wrong - so the
 * lines say what happened in whole words rather than in codes.
 */

const started = Date.now();

function stamp(): string {
  const s = Math.round((Date.now() - started) / 100) / 10;
  return `[${s.toFixed(1)}s]`.padStart(8);
}

export function step(message: string): void {
  console.log(`${stamp()} ${message}`);
}

export function detail(message: string): void {
  console.log(`${stamp()}   ${message}`);
}

export function warn(message: string): void {
  console.warn(`${stamp()} ! ${message}`);
}

export function fail(message: string): void {
  console.error(`${stamp()} X ${message}`);
}

export function heading(message: string): void {
  console.log(`\n${'='.repeat(60)}\n${message}\n${'='.repeat(60)}`);
}

/** Turns anything thrown into one readable line. */
export function reason(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
