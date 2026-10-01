import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { formatTimeline, type TimelineLine } from "./timeline.ts";

const DiagnosisSchema = z.object({
  observed: z.string(),
  suspected_cause: z.string(),
  owner: z.enum(["customer side", "carrier", "platform", "unknown"]),
  visibility_ends_at: z.string(),
  evidence: z.array(z.object({ line_id: z.string(), quote: z.string() })),
  next_check: z.string(),
  missing: z.array(z.string()),
  confidence: z.string(),
});
export type Diagnosis = z.infer<typeof DiagnosisSchema>;

const MODEL = "claude-sonnet-5-5";
const SYSTEM_PROMPT = readFileSync(new URL("../prompts/diagnose.md", import.meta.url), "utf8");

export async function diagnose(ticket: string, timeline: TimelineLine[]): Promise<Diagnosis> {
  const userMessage = `Ticket complaint:\n${ticket}\n\nCall timeline (id | timestamp | call leg | capture point | text):\n${formatTimeline(timeline)}`;
  if (!process.env.ANTHROPIC_API_KEY) return diagnoseViaClaudeCli(userMessage);

  const client = new Anthropic();
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    output_config: { format: zodOutputFormat(DiagnosisSchema) },
  });
  if (response.stop_reason === "refusal") throw new Error("Model refused to diagnose this call");
  if (!response.parsed_output) throw new Error(`No diagnosis returned (stop_reason: ${response.stop_reason})`);
  return response.parsed_output;
}

// No API key: same model, prompt and schema via the Claude Code CLI (uses its login).
// Runs from a temp dir with no settings, so no CLAUDE.md or tools leak in.
function diagnoseViaClaudeCli(userMessage: string): Diagnosis {
  const out = execFileSync(
    "claude",
    [
      "-p",
      "--model", MODEL,
      "--tools", "",
      "--setting-sources", "",
      "--no-session-persistence",
      "--system-prompt", SYSTEM_PROMPT,
      "--json-schema", JSON.stringify(z.toJSONSchema(DiagnosisSchema, { target: "draft-7" })),
      "--output-format", "json",
    ],
    { input: userMessage, cwd: tmpdir(), encoding: "utf8", maxBuffer: 10_000_000 },
  );
  const result = JSON.parse(out);
  if (result.is_error || !result.structured_output) throw new Error(`Claude CLI failed: ${result.result}`);
  return DiagnosisSchema.parse(result.structured_output);
}
