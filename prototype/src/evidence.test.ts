import { describe, expect, it } from "vitest";
import { checkEvidence } from "./evidence.ts";
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

describe("checkEvidence", () => {
  it("passes when the quote (trimmed) is inside the named line", () => {
    expect(checkEvidence(timeline, [{ line_id: "L1", quote: "  out_packets=1498 " }])).toEqual([]);
  });

  it("fails an unknown line ID", () => {
    expect(checkEvidence(timeline, [{ line_id: "L9", quote: "out_packets=1498" }])).toEqual([
      { line_id: "L9", quote: "out_packets=1498", reason: "line L9 does not exist" },
    ]);
  });

  it("fails a quote that is not in the named line", () => {
    expect(checkEvidence(timeline, [{ line_id: "L1", quote: "out_packets=0" }])).toEqual([
      { line_id: "L1", quote: "out_packets=0", reason: "quote not found in line L1" },
    ]);
  });

  it("fails when no evidence is given", () => {
    expect(checkEvidence(timeline, [])).toEqual([{ line_id: "-", quote: "", reason: "no evidence given" }]);
  });

  it("fails an empty quote", () => {
    expect(checkEvidence(timeline, [{ line_id: "L1", quote: "  " }])).toEqual([
      { line_id: "L1", quote: "  ", reason: "quote is empty" },
    ]);
  });
});
