import Anthropic from "@anthropic-ai/sdk";

export type Classification = {
  verdict: string;
  severity: number;
  tags: string[];
};

const client = new Anthropic();

type ClassifyInput = {
  text: string;
  speaker: string;
  location?: string;
  context?: string;
  witnesses?: string[];
  existingTags: string[];
  image?: { base64: string; mediaType: string };
};

export async function classifyQuote(
  input: ClassifyInput
): Promise<Classification | null> {
  const prompt = `You are the archivist for The Ledger, a group's record of the unhinged things its members say. A new quote has been submitted as evidence.

QUOTE: "${input.text}"
SPEAKER: ${input.speaker}
${input.location ? `LOCATION: ${input.location}` : ""}
${input.context ? `CONTEXT: ${input.context}` : ""}
${input.witnesses?.length ? `WITNESSES: ${input.witnesses.join(", ")}` : ""}

Tags already in use in this archive (reuse when they fit, invent only when nothing fits):
${input.existingTags.length ? input.existingTags.join(", ") : "(none yet)"}

Return ONLY a JSON object, no markdown fences, no prose:
{
  "verdict": "one line, funny, specific to this exact quote — a ruling, not a summary",
  "severity": 1-5 (integer; 1 = mildly incriminating, 5 = career-ending if leaked),
  "tags": ["2-4 short lowercase freeform tags, e.g. hubris, food-related, spiritually unwell"]
}`;

  const content: Anthropic.ContentBlockParam[] = [];
  if (input.image) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: input.image.mediaType as
          | "image/jpeg"
          | "image/png"
          | "image/gif"
          | "image/webp",
        data: input.image.base64,
      },
    });
  }
  content.push({ type: "text", text: prompt });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;
    return parseClassification(textBlock.text);
  } catch (err) {
    console.error("classify failed:", err);
    return null;
  }
}

function parseClassification(raw: string): Classification | null {
  // Strip markdown fences if the model added them anyway, then find the JSON object.
  const cleaned = raw.replace(/```(json)?/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (typeof parsed.verdict !== "string") return null;
    const severity = Math.min(5, Math.max(1, Math.round(Number(parsed.severity) || 3)));
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.filter((t: unknown) => typeof t === "string").slice(0, 4)
      : [];
    return { verdict: parsed.verdict, severity, tags };
  } catch {
    return null;
  }
}
