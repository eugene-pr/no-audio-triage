import type { TimelineLine } from "./timeline.ts";

export type Evidence = { line_id: string; quote: string };
export type EvidenceFailure = Evidence & { reason: string };

// Plain code, no LLM: each quote must be in the timeline line it names.
export function checkEvidence(timeline: TimelineLine[], evidence: Evidence[]): EvidenceFailure[] {
  if (evidence.length === 0) return [{ line_id: "-", quote: "", reason: "no evidence given" }];
  const byId = new Map(timeline.map((l) => [l.id, l.text.trim()]));
  return evidence.flatMap((e) => {
    const text = byId.get(e.line_id);
    if (text === undefined) return [{ ...e, reason: `line ${e.line_id} does not exist` }];
    if (e.quote.trim() === "") return [{ ...e, reason: "quote is empty" }];
    if (!text.includes(e.quote.trim())) return [{ ...e, reason: `quote not found in line ${e.line_id}` }];
    return [];
  });
}
