export type CallBundle = {
  ticket: string;
  call_id: string;
  sources: { capture_point: string; leg: string; lines: string[] }[];
};

export type TimelineLine = {
  id: string;
  timestamp: string;
  leg: string;
  capture_point: string;
  text: string;
};

// Merge all sources into one time-ordered list. Keeps every line, incl. old
// media setups: picking the current SDP is the LLM's job, not ours.
export function buildTimeline(bundle: CallBundle): TimelineLine[] {
  const lines = bundle.sources.flatMap((source) =>
    source.lines.map((raw) => {
      const space = raw.indexOf(" ");
      const timestamp = raw.slice(0, space);
      if (space < 0 || Number.isNaN(Date.parse(timestamp))) throw new Error(`Bad timestamp in line: "${raw}"`);
      return {
        timestamp,
        leg: source.leg,
        capture_point: source.capture_point,
        text: raw.slice(space + 1),
      };
    }),
  );
  // Stable sort: same-timestamp lines keep bundle order.
  lines.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  return lines.map((line, i) => ({ id: `L${i + 1}`, ...line }));
}

export function formatTimeline(timeline: TimelineLine[]): string {
  return timeline
    .map((l) => `${l.id} | ${l.timestamp} | ${l.leg} | ${l.capture_point} | ${l.text}`)
    .join("\n");
}
