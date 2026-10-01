import { checkEvidence } from "./evidence.ts";
import type { SavedResult } from "./result.ts";

const WIDTH = 100;

// Word-wraps text; every line starts with indent.
function wrap(text: string, indent: string): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && indent.length + line.length + 1 + word.length > WIDTH) {
      lines.push(indent + line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  return [...lines, indent + line];
}

// "Label: text", wrapped, continuation lines aligned under the text.
function field(label: string, text: string): string[] {
  const head = `  ${label.padEnd(20)}`;
  const [first, ...rest] = wrap(text, " ".repeat(head.length));
  return [head + first.trimStart(), ...rest];
}

// Readable triage note, answer first. Any evidence failure hides every LLM field.
export function renderNote({ call_id, timeline, diagnosis }: SavedResult): string {
  const failures = checkEvidence(timeline, diagnosis.evidence);
  const out = [`TRIAGE NOTE (internal) - call ${call_id}`];

  if (failures.length > 0) {
    out.push("Evidence check: CHECK FAILED - diagnosis hidden. Investigate manually.");
    for (const f of failures) out.push(`  - ${f.line_id} "${f.quote}": ${f.reason}`);
  } else {
    const byId = new Map(timeline.map((l) => [l.id, l]));
    out.push(
      "Evidence check: passed",
      "",
      "SUMMARY",
      ...field("Owner:", diagnosis.owner),
      ...field("Suspected cause:", diagnosis.suspected_cause),
      ...field("Confidence:", diagnosis.confidence),
      "",
      "NEXT STEP",
      ...wrap(diagnosis.next_check, "  "),
      "",
      "FINDINGS",
      ...field("Observed:", diagnosis.observed),
      ...field("Visibility ends at:", diagnosis.visibility_ends_at),
      "",
      "EVIDENCE",
      ...diagnosis.evidence.flatMap((e) => {
        const l = byId.get(e.line_id)!;
        return [`  ${l.id.padEnd(4)}${l.leg} @ ${l.capture_point}, ${l.timestamp}`, `      "${e.quote.trim()}"`];
      }),
      "",
      "MISSING",
      ...diagnosis.missing.flatMap((m) => wrap(m, "    ").map((s, i) => (i ? s : `  - ${s.trimStart()}`))),
    );
  }

  out.push(
    "",
    "Links (simulated placeholders):",
    `  Homer:    https://homer.example.internal/call/${call_id}`,
    `  Raw logs: https://logs.example.internal/calls/${call_id}`,
  );
  return out.join("\n");
}
