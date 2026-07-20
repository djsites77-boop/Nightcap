import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Regional STR news for the dashboard — "what's happening in my city that
 * could affect my listing." Uses Claude's server-side web_search tool
 * rather than a separate news API, since Nightcap already depends on
 * ANTHROPIC_API_KEY for AI-assisted rule extraction and receipt parsing.
 *
 * Unlike rule-extraction.ts and receipt-parsing.ts, this has no save-time
 * human review step — it's read-only news, not something that gets written
 * into ComplianceRule or Expense. The trust boundary is different: a wrong
 * headline is a bad dashboard widget, not a wrong tax number.
 */

export interface RegionalNewsItem {
  headline: string;
  source: string;
  url: string;
  publishedOn: string | null;
  summary: string;
}

const REPORT_NEWS_TOOL: Anthropic.Tool = {
  name: "report_str_news",
  description:
    "Report the short-term-rental regulation/market news items found for this region. Call this exactly once, after searching.",
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            headline: { type: "string" },
            source: { type: "string", description: "Publication name, e.g. \"CBC News\"" },
            url: { type: "string" },
            publishedOn: { type: ["string", "null"], description: "ISO 8601 date if known, else null" },
            summary: { type: "string", description: "One or two sentences on why this matters to an STR host" },
          },
          required: ["headline", "source", "url", "summary"],
        },
      },
    },
    required: ["items"],
  },
};

/** Live search — always hits the API. Callers should go through getCachedRegionalNews instead. */
export async function fetchRegionalStrNews(regionLabel: string): Promise<RegionalNewsItem[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  const message = await client.messages.create({
    model,
    max_tokens: 2048,
    tools: [
      { type: "web_search_20260318", name: "web_search", max_uses: 4 },
      REPORT_NEWS_TOOL,
    ],
    messages: [
      {
        role: "user",
        content:
          `Search for short-term-rental / Airbnb / VRBO regulation and market news from the last ~60 days ` +
          `specific to ${regionLabel}. Focus on: new bylaws, night-cap or licensing rule changes, enforcement ` +
          `crackdowns, and municipal accommodation tax changes. Once you've searched, call report_str_news ` +
          `exactly once with up to 5 of the most relevant, most recent items you actually found — never invent ` +
          `one. If nothing relevant turns up, call it with an empty items array.`,
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === "report_str_news"
  );
  if (!toolUse) return [];

  const input = toolUse.input as { items?: RegionalNewsItem[] };
  return input.items ?? [];
}

const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Cached read for the dashboard — refreshes at most once per day per
 * municipality rather than searching on every page load. Falls back to
 * whatever's cached (even if stale) if a refresh attempt fails, and to an
 * empty list if there's no cache yet and the refresh also fails — a broken
 * news widget should never break the dashboard.
 */
export async function getCachedRegionalNews(
  municipalityId: string,
  regionLabel: string
): Promise<RegionalNewsItem[]> {
  const cached = await prisma.regionalNewsCache.findUnique({ where: { municipalityId } });
  const isStale = !cached || Date.now() - cached.fetchedAt.getTime() > MAX_CACHE_AGE_MS;

  if (!isStale) return cached.items as unknown as RegionalNewsItem[];

  try {
    const items = await fetchRegionalStrNews(regionLabel);
    const itemsJson = items as unknown as Prisma.InputJsonValue;
    await prisma.regionalNewsCache.upsert({
      where: { municipalityId },
      create: { municipalityId, items: itemsJson, fetchedAt: new Date() },
      update: { items: itemsJson, fetchedAt: new Date() },
    });
    return items;
  } catch {
    return cached ? (cached.items as unknown as RegionalNewsItem[]) : [];
  }
}
