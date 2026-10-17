import type { RedFlag } from "./types";

export type Segment = { text: string; flag: number | null };

/**
 * Splits the message into plain and highlighted segments. `flag` is the index into
 * `flags`. Each quote is placed at its first occurrence; when two quotes overlap the
 * earlier (then longer) one wins and the other is reported as unplaced.
 */
export function buildSegments(
  message: string,
  flags: RedFlag[],
): { segments: Segment[]; unplaced: number[] } {
  const ranges = flags
    .map((f, i) => ({ i, start: message.indexOf(f.quote), len: f.quote.length }))
    .filter((r) => r.start !== -1 && r.len > 0)
    .sort((a, b) => a.start - b.start || b.len - a.len);

  const placed: typeof ranges = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start < cursor) continue;
    placed.push(r);
    cursor = r.start + r.len;
  }

  const segments: Segment[] = [];
  let pos = 0;
  for (const r of placed) {
    if (r.start > pos) segments.push({ text: message.slice(pos, r.start), flag: null });
    segments.push({ text: message.slice(r.start, r.start + r.len), flag: r.i });
    pos = r.start + r.len;
  }
  if (pos < message.length) segments.push({ text: message.slice(pos), flag: null });

  const placedIdx = new Set(placed.map((r) => r.i));
  const unplaced = flags.map((_, i) => i).filter((i) => !placedIdx.has(i));
  return { segments, unplaced };
}
