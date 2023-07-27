import cheerio from 'cheerio';
import { NodeHtmlMarkdown } from 'node-html-markdown';

interface Page {
  url: string;
  content: string;
}

class Crawler {
  private _seen = new Set<string>();
  private _pages: Page[] = [];
  private _queue: { url: string; depth: number }[] = [];

  constructor(private _maxDepth = 40, private _maxPages = 300) { }

  async crawl(startUrl: string): Promise<Page[]> {
    // Add the start URL to the queue
    this._addToQueue(startUrl);

    // While there are URLs in the queue and we haven't reached the maximum number of pages...
    while (this._shouldContinueCrawling()) {
      // Dequeue the next URL and depth
      const { url, depth } = this._queue.shift()!;

      // If the depth is too great or we've already seen this URL, skip it
      if (this._isTooDeep(depth) || this._isAlreadySeen(url)) continue;

      // Add the URL to the set of seen URLs
      this._seen.add(url);

      // Fetch the page HTML
      const html = await this._fetchPage(url);

      // Parse the HTML and add the page to the list of crawled pages
      this._pages.push({ url, content: this._parseHtml(html) });

      // Extract new URLs from the page HTML and add them to the queue
      this._addNewUrlsToQueue(this._extractUrls(html, url), depth);
    }

    // Return the list of crawled pages
    return this._pages;
  }

  private _isTooDeep(depth: number) {
    return depth > this._maxDepth;
  }

  private _isAlreadySeen(url: string) {
    return this._seen.has(url);
  }

  private _shouldContinueCrawling() {
    return this._queue.length > 0 && this._pages.length < this._maxPages;
  }

  private _addToQueue(url: string, depth = 0) {
    this._queue.push({ url, depth });
  }

  private _addNewUrlsToQueue(urls: string[], depth: number) {
    this._queue.push(...urls.map(url => ({ url, depth: depth + 1 })));
  }

  private async _fetchPage(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      return await response.text();
    } catch (error) {
      console.error(`Failed to fetch ${url}: ${error}`);
      return '';
    }
  }

  private _parseHtml(html: string): string {
    const $ = cheerio.load(html);
    $('a').removeAttr('href');
    return NodeHtmlMarkdown.translate($.html());
  }

  private _extractUrls(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    const relativeUrls = $('a').map((_, link) => $(link).attr('href')).get() as string[];

    const validUrls: string[] = [];
    for (const relativeUrl of relativeUrls) {
      try {
        const absoluteUrl = new URL(relativeUrl, baseUrl).href;
        validUrls.push(absoluteUrl);
      } catch (error) {
        console.error(`Invalid URL: ${relativeUrl}`);
      }
    }

    return validUrls;
  }
}

export { Crawler };
export type { Page };
