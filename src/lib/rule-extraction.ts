import Anthropic from "@anthropic-ai/sdk";

/**
 * AI-assisted compliance rule extraction from pasted bylaw text — an admin
 * convenience, never an authority. This ONLY ever proposes a value for a
 * human to review and edit before saving; nothing here writes to
 * ComplianceRule directly. That mirrors the spec's own stance on [VERIFY]
 * figures: a rule sourced from a document (or a model's reading of one)
 * isn't compliant-grade until a human confirms it against the primary
 * source. Needs ANTHROPIC_API_KEY — not configured in this session.
 */

export interface RuleSuggestion {
  ruleType: string;
  unitType: "entire_home" | "partial_unit" | "all";
  value: Record<string, unknown>;
  effectiveDate: string | null;
  sourceQuote: string;
  confidence: "high" | "medium" | "low";
}

const RULE_TYPES = [
  "night_cap",
  "mat_rate",
  "registration_fee",
  "occupancy_limit",
  "record_retention_years",
  "partial_unit_bedroom_cap",
] as const;

const PROPOSE_RULE_TOOL: Anthropic.Tool = {
  name: "propose_compliance_rule",
  description:
    "Propose ONE structured compliance rule extracted from the supplied bylaw text. If the text doesn't clearly state a value, set confidence to \"low\" rather than guessing.",
  input_schema: {
    type: "object",
    properties: {
      ruleType: { type: "string", enum: [...RULE_TYPES] },
      unitType: { type: "string", enum: ["entire_home", "partial_unit", "all"] },
      value: {
        type: "object",
        description:
          'Shape depends on ruleType: night_cap -> {"nights": number}; mat_rate -> {"rate": number (0-1)}; registration_fee -> {"feeCents": number}; occupancy_limit -> {"adultsPerBedroom": number}; record_retention_years -> {"years": number}; partial_unit_bedroom_cap -> {"maxBedroomsSimultaneous": number, "oneFewerThanTotal": boolean}.',
      },
      effectiveDate: { type: ["string", "null"], description: "ISO 8601 date if the text states one, else null" },
      sourceQuote: { type: "string", description: "The exact sentence(s) this value was read from" },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
    },
    required: ["ruleType", "unitType", "value", "sourceQuote", "confidence"],
  },
};

export async function suggestRuleFromText(bylawText: string, ruleTypeHint?: string): Promise<RuleSuggestion> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured — add it to .env to enable AI-assisted rule extraction."
    );
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  const message = await client.messages.create({
    model,
    max_tokens: 1024,
    tools: [PROPOSE_RULE_TOOL],
    tool_choice: { type: "tool", name: "propose_compliance_rule" },
    messages: [
      {
        role: "user",
        content:
          `Read the following short-term-rental bylaw excerpt and propose a single structured compliance rule` +
          (ruleTypeHint ? ` of type "${ruleTypeHint}"` : "") +
          `. Quote the exact text you based it on, and mark confidence "low" if the excerpt is ambiguous or silent on the value rather than inferring one.\n\n---\n${bylawText}\n---`,
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("The model didn't return a structured suggestion — try again with more specific text.");
  }

  return toolUse.input as RuleSuggestion;
}
