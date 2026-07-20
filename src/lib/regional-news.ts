import { XMLParser } from "fast-xml-parser";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Regional STR news for the dashboard — "what's happening in my city that
 * could affect my listing." Pulled from Google News' public RSS search feed
 * (no API key, no per-request charge, no AI involved) rather than a paid
 * news API or an LLM search tool — the cost here needed to be flat/free,
 * not usage-metered.
 */

export interface RegionalNewsItem {
  headline: string;
  source: string;
  url: string;
  publishedOn: string | null;
  summary: string;
}

const MAX_ITEMS = 5;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

interface GoogleNewsItem {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  source?: { "#text"?: string } | string;
}

/** Pure parser — no network — so this can be unit-tested against a fixed sample. */
export function parseGoogleNewsRss(xml: string): RegionalNewsItem[] {
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(xml);
  const rawItems: GoogleNewsItem | GoogleNewsItem[] | undefined = parsed?.rss?.channel?.item;
  const items: GoogleNewsItem[] = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  return items
    .slice(0, MAX_ITEMS)
    .map((item): RegionalNewsItem => {
      const title = String(item.title ?? "").trim();
      const lastDash = title.lastIndexOf(" - ");
      const headline = lastDash > -1 ? title.slice(0, lastDash) : title;
      const sourceField = item.source;
      const source =
        (typeof sourceField === "object" ? sourceField["#text"] : sourceField) ||
        (lastDash > -1 ? title.slice(lastDash + 3) : "Google News");

      return {
        headline,
        source: String(source),
        url: String(item.link ?? ""),
        publishedOn: item.pubDate ? new Date(item.pubDate).toISOString().slice(0, 10) : null,
        summary: stripHtml(String(item.description ?? "")).slice(0, 300),
      };
    })
    .filter((item) => item.url && item.headline);
}

/** Live fetch — always hits the feed. Callers should go through getCachedRegionalNews instead. */
export async function fetchRegionalStrNews(regionLabel: string): Promise<RegionalNewsItem[]> {
  const query = `"${regionLabel}" (short-term rental OR Airbnb OR VRBO) (bylaw OR regulation OR crackdown OR tax OR licence OR license)`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-CA&gl=CA&ceid=CA:en`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; NightcapNewsBot/1.0)" },
  });
  if (!res.ok) throw new Error(`Google News feed returned ${res.status}`);
  const xml = await res.text();
  return parseGoogleNewsRss(xml);
}

const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Cached read for the dashboard — refreshes at most once per day per
 * municipality rather than fetching on every page load. Falls back to
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
