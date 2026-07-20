import { describe, it, expect } from "vitest";
import { parseGoogleNewsRss } from "./regional-news";

// A trimmed but structurally faithful sample of what Google News' RSS search
// feed actually returns (verified format: title is "Headline - Source",
// description is an HTML snippet, source is a separate tagged field).
const SAMPLE_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>"Toronto" Airbnb bylaw - Google News</title>
    <item>
      <title>Toronto weighs new short-term rental crackdown - CBC News</title>
      <link>https://news.google.com/rss/articles/CBMi_toronto_example</link>
      <guid isPermaLink="false">abc123</guid>
      <pubDate>Sun, 19 Jul 2026 12:00:00 GMT</pubDate>
      <description>&lt;a href="https://news.google.com/rss/articles/CBMi_toronto_example" target="_blank"&gt;Toronto weighs new short-term rental crackdown&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;CBC News&lt;/font&gt;</description>
      <source url="https://www.cbc.ca">CBC News</source>
    </item>
    <item>
      <title>City council votes on Airbnb licensing changes - Toronto Star</title>
      <link>https://news.google.com/rss/articles/CBMi_star_example</link>
      <guid isPermaLink="false">def456</guid>
      <pubDate>Sat, 18 Jul 2026 09:30:00 GMT</pubDate>
      <description>&lt;a href="https://news.google.com/rss/articles/CBMi_star_example" target="_blank"&gt;City council votes on Airbnb licensing changes&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;Toronto Star&lt;/font&gt;</description>
      <source url="https://www.thestar.com">Toronto Star</source>
    </item>
  </channel>
</rss>`;

describe("parseGoogleNewsRss", () => {
  it("extracts headline, source, url, date, and a stripped-HTML summary per item", () => {
    const items = parseGoogleNewsRss(SAMPLE_FEED);
    expect(items).toHaveLength(2);

    expect(items[0].headline).toBe("Toronto weighs new short-term rental crackdown");
    expect(items[0].source).toBe("CBC News");
    expect(items[0].url).toBe("https://news.google.com/rss/articles/CBMi_toronto_example");
    expect(items[0].publishedOn).toBe("2026-07-19");
    expect(items[0].summary).not.toMatch(/<[^>]+>/); // no leftover HTML tags
    expect(items[0].summary).toContain("Toronto weighs new short-term rental crackdown");
  });

  it("falls back to splitting the title's trailing ' - Source' when the <source> tag is absent", () => {
    const feedWithoutSourceTag = SAMPLE_FEED.replace(
      /<source url="https:\/\/www\.cbc\.ca">CBC News<\/source>/,
      ""
    );
    const items = parseGoogleNewsRss(feedWithoutSourceTag);
    expect(items[0].source).toBe("CBC News");
  });

  it("returns an empty list for a feed with no items", () => {
    const emptyFeed = `<?xml version="1.0"?><rss version="2.0"><channel><title>No results</title></channel></rss>`;
    expect(parseGoogleNewsRss(emptyFeed)).toEqual([]);
  });

  it("handles a single <item> (not wrapped in an array) the same as multiple", () => {
    const singleItemFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>"Toronto" Airbnb bylaw - Google News</title>
    <item>
      <title>Toronto weighs new short-term rental crackdown - CBC News</title>
      <link>https://news.google.com/rss/articles/CBMi_toronto_example</link>
      <pubDate>Sun, 19 Jul 2026 12:00:00 GMT</pubDate>
      <description>&lt;a href="https://news.google.com/rss/articles/CBMi_toronto_example" target="_blank"&gt;Toronto weighs new short-term rental crackdown&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;CBC News&lt;/font&gt;</description>
      <source url="https://www.cbc.ca">CBC News</source>
    </item>
  </channel>
</rss>`;
    const items = parseGoogleNewsRss(singleItemFeed);
    expect(items).toHaveLength(1);
    expect(items[0].source).toBe("CBC News");
  });
});
