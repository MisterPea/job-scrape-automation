import { AppConfig } from "./config";
import axios from "axios";
import { SanitizedSearchResult } from "./types";
import writeCsv from "./csvControl";
import currentDatetime from "./helpers/getDate";

export class Search {
  queue: Array<{ retries: number; url: string; }> = [];
  searchItems: Array<SanitizedSearchResult> = [];

  constructor(public config: AppConfig, public db: any, public maxRetries: number = 3) {
    this.config = config;
    this.maxRetries = maxRetries;
    this.queue = [];
    this.searchItems = [];
    this.db = db;
  }

  private timeoutPromise(ms = 100) {
    return new Promise((resolve, _) => {
      setTimeout(() => {
        resolve(true);
      }, ms);
    });
  }

  /**
   * Method to coordinate the searching and writing of job-search results.
   * @param {string[]} terms Terms to search for via Google Custom Search
   */
  async getResults(terms: string[]) {
    console.info(`Initiating Google Custom Search`);
    const { searchApiKey, searchIdCx, timePeriod, sortBy } = this.config;
    for (const term of terms) {
      const rootSearchUrl = `https://www.googleapis.com/customsearch/v1?key=${searchApiKey}&cx=${searchIdCx}&dateRestrict=${timePeriod}&sort=${sortBy}`;
      const perSearchUrl = `${rootSearchUrl}&q=${encodeURIComponent(term)}`;
      this.queue.push({ retries: 0, url: perSearchUrl });
    }

    // Search places items in class-scoped this.searchItems
    await this.runSearch();

    // Write to sqlite
    console.info(`Preparing search results`);
    const { keys, vals } = this.db.prepareObjectsForInsert(this.searchItems);

    if (!vals.length) {
      console.info('No search results');
      return;
    }
    
    try {
      await this.db.insertData(`
        INSERT OR IGNORE INTO discovered_jobs (${keys.join(', ')})
        VALUES (${new Array(keys.length).fill('?').join(', ')})`,
        vals
      );
      console.info(`Search return: ${vals.length} rows added to the db`);
    } catch (err) {
      console.error(`There was an error inserting search returns: ${err}`);
    }
  }

  // remove `/apply` and `/application` when they appear at the end of url
  private cleanLink(link: string) {
    const regex = /\/(apply|application)(?:[\/?].*)?$/;
    return link.replace(regex, '');
  }

  private async runSearch() {
    if (this.queue.length === 0) return;

    // store original url to allow append of &start=n for multi-page queries
    let originalUrl = undefined;

    while (this.queue.length > 0) {
      const queueElement = this.queue.pop();
      if (!queueElement) return;

      const { url, retries } = queueElement;

      if (retries >= this.maxRetries) return;
      if (originalUrl === undefined) originalUrl = url;

      try {
        const { data } = await axios({
          method: 'GET',
          url: url,
          headers: {
            'Accept-Encoding': 'gzip'
          }
        });

        const { queries, items } = data;
        if (!items) return; // needed, as sometimes there's a valid return with no items (meaning end of query)

        const sanitizedItems = items.map(({ title, link, snippet }: { title: string, link: string, snippet: string; }) => ({ title, link: this.cleanLink(link), snippet }));

        this.searchItems.push(...sanitizedItems);

        // if more pages, the search result says so. Therefor if nextPage, we get the start index and 
        // push the url back into the queue.
        if (queries.nextPage) {
          this.queue.push({ retries: 0, url: `${originalUrl}&start=${queries.nextPage[0].startIndex}` });
        }
      } catch (err) {
        this.queue.push({ url, retries: retries + 1 });
        const errorObj = [{ date: currentDatetime(), location: "search", error: JSON.stringify(err), url, retries }];
        writeCsv('errors.csv', errorObj);
      }
      await this.timeoutPromise();
    }
    return;
  }
}
