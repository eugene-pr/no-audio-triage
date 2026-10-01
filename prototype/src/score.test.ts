import { describe, expect, it } from "vitest";
import type { Diagnosis } from "./diagnosis.ts";
import { scoreRun, type Expected } from "./score.ts";
import type { TimelineLine } from "./timeline.ts";

const line = (id: string, text: string): TimelineLine => ({
  id,
  timestamp: "2026-09-29T10:00:01.000Z",
  leg: "customer<->platform",
  capture_point: "fs-media-1",
  text,
});
const timeline = [line("L1", "SDP c=IN IP4 192.168.1.23"), line("L2", "RTP out_packets=1498")];

const diagnosis: Diagnosis = {
  observed: "Return RTP sent",
  suspected_cause: "Guess: agent headset muted",
  owner: "customer side",
  visibility_ends_at: "Packets leave our node",
  evidence: [{ line_id: "L2", quote: "out_packets=1498" }],
  next_check: "Check headset",
  missing: [],
  confidence: "Low",
};

const expected: Expected = { owner: "customer side", required_line_ids: ["L2"], forbidden_line_ids: ["L1"] };

describe("scoreRun", () => {
  it("passes when every rule holds", () => {
    expect(scoreRun(expected, timeline, diagnosis)).toEqual({
      pass: true,
      checks: { owner: "ok", evidence: "ok", required: "ok", forbidden: "ok", cause: "-" },
      reasons: [],
    });
  });

  it("fails a wrong owner", () => {
    const r = scoreRun(expected, timeline, { ...diagnosis, owner: "platform" });
    expect(r.pass).toBe(false);
    expect(r.checks.owner).toBe("FAIL");
    expect(r.reasons).toEqual(['owner: expected "customer side", got "platform"']);
  });

  it("fails when the evidence check fails", () => {
    const bad = { ...diagnosis, evidence: [...diagnosis.evidence, { line_id: "L9", quote: "x" }] };
    expect(scoreRun(expected, timeline, bad).reasons).toEqual(["evidence check failed: L9 line L9 does not exist"]);
  });

  it("fails a missing required line ID", () => {
    const r = scoreRun({ ...expected, required_line_ids: ["L1", "L2"], forbidden_line_ids: [] }, timeline, diagnosis);
    expect(r.reasons).toEqual(["required line L1 not cited"]);
  });

  it("fails a cited forbidden line ID", () => {
    const cites = { ...diagnosis, evidence: [...diagnosis.evidence, { line_id: "L1", quote: "192.168.1.23" }] };
    expect(scoreRun(expected, timeline, cites).reasons).toEqual(["forbidden line L1 cited"]);
  });

  it("fails a suspected cause matching the banned pattern, case-insensitive", () => {
    const r = scoreRun(
      { ...expected, suspected_cause_must_not_match: "\\bNAT\\b|private IP" },
      timeline,
      { ...diagnosis, suspected_cause: "Agent behind nat" },
    );
    expect(r.reasons).toEqual(['suspected cause matches /\\bNAT\\b|private IP/i: "Agent behind nat"']);
  });

  it("does not match NAT inside other words", () => {
    const r = scoreRun(
      { ...expected, suspected_cause_must_not_match: "\\bNAT\\b|private IP" },
      timeline,
      { ...diagnosis, suspected_cause: "Guess: alternate termination path" },
    );
    expect(r.pass).toBe(true);
  });

  it("lists every failure reason", () => {
    const r = scoreRun({ ...expected, required_line_ids: ["L1"] }, timeline, { ...diagnosis, owner: "unknown" });
    expect(r.pass).toBe(false);
    expect(r.reasons).toHaveLength(2);
  });
});
