import type { Diagnosis } from "./diagnosis.ts";
import { checkEvidence } from "./evidence.ts";
import type { TimelineLine } from "./timeline.ts";

export type Expected = {
  owner: Diagnosis["owner"];
  required_line_ids: string[];
  forbidden_line_ids: string[];
  suspected_cause_must_not_match?: string;
};

type Status = "ok" | "FAIL" | "-";

// Plain code, no judge LLM: compares one diagnosis to its expected answer.
export function scoreRun(expected: Expected, timeline: TimelineLine[], diagnosis: Diagnosis) {
  const cited = new Set(diagnosis.evidence.map((e) => e.line_id));
  const pattern = expected.suspected_cause_must_not_match;
  const bannedCause = pattern ? new RegExp(pattern, "i") : undefined;

  // Fail reasons per rule; empty list = rule passed.
  const failed = {
    owner: diagnosis.owner === expected.owner ? [] : [`owner: expected "${expected.owner}", got "${diagnosis.owner}"`],
    evidence: checkEvidence(timeline, diagnosis.evidence).map((f) => `evidence check failed: ${f.line_id} ${f.reason}`),
    required: expected.required_line_ids.filter((id) => !cited.has(id)).map((id) => `required line ${id} not cited`),
    forbidden: expected.forbidden_line_ids.filter((id) => cited.has(id)).map((id) => `forbidden line ${id} cited`),
    cause: bannedCause?.test(diagnosis.suspected_cause) ? [`suspected cause matches ${bannedCause}: "${diagnosis.suspected_cause}"`] : [],
  };

  const reasons = Object.values(failed).flat();
  const status = (rule: keyof typeof failed): Status => (failed[rule].length ? "FAIL" : "ok");
  const checks = {
    owner: status("owner"),
    evidence: status("evidence"),
    required: status("required"),
    forbidden: status("forbidden"),
    cause: bannedCause ? status("cause") : "-",
  };
  return { pass: reasons.length === 0, checks, reasons };
}
