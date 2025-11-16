import { AppConfig } from "./config";
import axios from "axios";
import { SanitizedSearchResult, SearchResult } from "./types";
import writeCsv from "./csvControl";


export class Search {
  queue: Array<{ retries: number; url: string; }> = [];
  searchItems: Array<SanitizedSearchResult> = [];

  constructor(public config: AppConfig, public maxRetries = 3) {
    this.config = config;
    this.maxRetries = maxRetries;
    this.queue = [];
    this.searchItems = [];
  }

  private timeoutPromise(ms = 100) {
    return new Promise((resolve, _) => {
      setTimeout(() => {
        resolve(true);
      }, ms);
    });
  }

  async getResults(terms: string[]) {
    const { searchApiKey, searchIdCx, timePeriod, sortBy } = this.config;
    for (const term of terms) {
      const rootSearchUrl = `https://www.googleapis.com/customsearch/v1?key=${searchApiKey}&cx=${searchIdCx}&dateRestrict=${timePeriod}&sort=${sortBy}`;
      const perSearchUrl = `${rootSearchUrl}&q="${term}"`;
      this.queue.push({ retries: 0, url: perSearchUrl });
    }

    await this.runSearch();
    console.log("DONE");
    this.searchItems;
    writeCsv("test.csv", this.searchItems);
  }

  // remove apply and application when they appear at the end of url
  private cleanLink(link: string) {
    const regex = /\/(apply|application)(?:[\/?].*)?$/;
    return link.replace(regex, '');
  }

  private async runSearch() {
    if (this.queue.length === 0) return;

    while (this.queue.length > 0) {
      const queueElement = this.queue.pop();
      if (!queueElement) return;

      const { url, retries } = queueElement;
      if (retries >= this.maxRetries) return;
      try {
        const { data } = await axios({
          method: 'GET',
          url: url,
          headers: {
            'Accept-Encoding': 'gzip'
          }
        });
        const { queries, items } = data;
        const sanitizedItems = items.map(({ title, link, snippet }: { title: string, link: string, snippet: string; }) => ({ title, link: this.cleanLink(link), snippet }));

        this.searchItems.push(...sanitizedItems);

        // if more pages, the search result says so. Therefor if nextPage, we get the start index and 
        // push the url back into the queue.
        if (queries.nextPage) {
          this.queue.push({ retries: 0, url: `${url}&start=${queries.nextPage[0].startIndex}` });
        }
      } catch (err) {
        this.queue.push({ url, retries: retries + 1 });
      }
      await this.timeoutPromise();
    }
    return;
  }
}
