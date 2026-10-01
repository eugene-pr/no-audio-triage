import { describe, expect, it } from "vitest";
import type { Diagnosis } from "./diagnosis.ts";
import { renderNote } from "./note.ts";
import type { TimelineLine } from "./timeline.ts";

const timeline: TimelineLine[] = [
  {
    id: "L1",
    timestamp: "2026-09-29T10:00:01.000Z",
    leg: "customer<->platform",
    capture_point: "fs-media-1",
    text: "RTP stats: in_packets=1500 out_packets=1498",
  },
];

const diagnosis: Diagnosis = {
  observed: "Return RTP sent toward customer",
  suspected_cause: "Guess: customer firewall drops return audio",
  owner: "customer side",
  visibility_ends_at: "Packets leave our media node",
  evidence: [{ line_id: "L1", quote: "out_packets=1498" }],
  next_check: "Customer IT checks firewall drops",
  missing: ["customer firewall logs"],
  confidence: "Medium: receipt unseen",
};

describe("renderNote", () => {
  it("shows the diagnosis with evidence labeled by leg, time and capture point", () => {
    const note = renderNote({ call_id: "abc-123", timeline, diagnosis });
    expect(note).toContain("Evidence check: passed");
    expect(note).toContain("Guess: customer firewall drops return audio");
    expect(note).toContain("customer side");
    expect(note).toContain("L1  customer<->platform @ fs-media-1, 2026-09-29T10:00:01.000Z");
    expect(note).toContain("abc-123");
  });

  it("puts the answer first: summary, next step, then findings and evidence", () => {
    const note = renderNote({ call_id: "abc-123", timeline, diagnosis });
    const order = ["SUMMARY", "Owner:", "NEXT STEP", "FINDINGS", "EVIDENCE", "MISSING"].map((s) => note.indexOf(s));
    expect(order.every((pos) => pos >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("wraps long text to 100 columns", () => {
    const note = renderNote({ call_id: "abc-123", timeline, diagnosis: { ...diagnosis, observed: "word ".repeat(60) } });
    expect(Math.max(...note.split("\n").filter((l) => !l.includes("http")).map((l) => l.length))).toBeLessThanOrEqual(100);
  });

  it("hides the whole diagnosis when one evidence item fails", () => {
    const bad = { ...diagnosis, evidence: [...diagnosis.evidence, { line_id: "L7", quote: "BYE" }] };
    const note = renderNote({ call_id: "abc-123", timeline, diagnosis: bad });
    expect(note).toContain("CHECK FAILED");
    expect(note).toContain("L7");
    expect(note).toContain("line L7 does not exist");
    for (const field of [bad.observed, bad.suspected_cause, bad.visibility_ends_at, bad.next_check, bad.confidence]) {
      expect(note).not.toContain(field);
    }
    expect(note).not.toContain("customer side");
    expect(note).toContain("abc-123"); // links still shown
  });
});
