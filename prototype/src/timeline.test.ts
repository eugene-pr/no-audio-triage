import { describe, expect, it } from "vitest";
import { buildTimeline, type CallBundle } from "./timeline.ts";

const bundle: CallBundle = {
  ticket: "Agent can't hear caller",
  call_id: "abc-123",
  sources: [
    {
      capture_point: "homer",
      leg: "customer<->platform",
      lines: [
        "2026-09-29T10:00:02.000Z INVITE sip:100@pbx SIP/2.0",
        "2026-09-29T10:04:00.000Z c=IN IP4 203.0.113.9",
      ],
    },
    {
      capture_point: "fs-media-1",
      leg: "platform<->agent",
      lines: ["2026-09-29T10:00:01.000Z c=IN IP4 198.51.100.7"],
    },
  ],
};

describe("buildTimeline", () => {
  it("sorts all lines across sources by timestamp and numbers them L1..Ln", () => {
    const timeline = buildTimeline(bundle);
    expect(timeline).toEqual([
      {
        id: "L1",
        timestamp: "2026-09-29T10:00:01.000Z",
        leg: "platform<->agent",
        capture_point: "fs-media-1",
        text: "c=IN IP4 198.51.100.7",
      },
      {
        id: "L2",
        timestamp: "2026-09-29T10:00:02.000Z",
        leg: "customer<->platform",
        capture_point: "homer",
        text: "INVITE sip:100@pbx SIP/2.0",
      },
      {
        id: "L3",
        timestamp: "2026-09-29T10:04:00.000Z",
        leg: "customer<->platform",
        capture_point: "homer",
        text: "c=IN IP4 203.0.113.9",
      },
    ]);
  });

  it("rejects a line without a valid leading timestamp", () => {
    const bad = (line: string): CallBundle => ({
      ticket: "t",
      call_id: "c",
      sources: [{ capture_point: "homer", leg: "a", lines: [line] }],
    });
    expect(() => buildTimeline(bad("INVITE"))).toThrow('Bad timestamp in line: "INVITE"');
    expect(() => buildTimeline(bad("10:00 BYE"))).toThrow('Bad timestamp in line: "10:00 BYE"');
  });

  it("keeps an old media setup after a re-INVITE replaces it", () => {
    const timeline = buildTimeline({
      ticket: "Audio stopped after transfer",
      call_id: "xyz",
      sources: [
        {
          capture_point: "homer",
          leg: "platform<->agent",
          lines: [
            "2026-09-29T10:04:00.000Z m=audio 6200 RTP/AVP 0",
            "2026-09-29T10:00:00.000Z m=audio 5000 RTP/AVP 0",
          ],
        },
      ],
    });
    expect(timeline.map((l) => l.text)).toEqual([
      "m=audio 5000 RTP/AVP 0",
      "m=audio 6200 RTP/AVP 0",
    ]);
  });
});
