import type { AppConfig } from "../config.js";
import axios from "axios";
import type { SanitizedSearchResult } from "./types.discovery.js";
import writeCsv from "../scripts/csvControl.js";
import currentDatetime from "../scripts/getDate.js";
import type { TitleGroup } from "./job_discovery.terms.js";
import { prepareObjectsForInsert } from "../scripts/prepareObjForInsert.js";
import type { DbMethods } from "@misterpea/sqlite-worker-db";

export class Search {
  queue: Array<{ retries: number; url: string; searchTerm: string }> = [];
  searchReturnItems: Array<SanitizedSearchResult> = [];

  constructor(
    public config: AppConfig,
    public db: DbMethods,
    public maxRetries = 3,
  ) {
    this.config = config;
    this.maxRetries = maxRetries;
    this.queue = [];
    this.searchReturnItems = [];
    this.db = db;
  }

  private buildJobQuery(termGroup: TitleGroup): string {
    const { baseTitle, variants } = termGroup;
    const compiled = `q=${encodeURIComponent(baseTitle)}&as_oq=${encodeURIComponent(variants.map((e) => `"${e}"`).join(" "))}`;
    return compiled;
  }

  /**
   * Method to coordinate the searching and writing of job-search results.
   * @param {string[]} terms Terms to search for via Google Custom Search
   * @returns None
   */
  async getResults(terms: TitleGroup[]) {
    const {
      searchApiKey,
      siteSearchIdCx,
      timePeriod,
      sortBy,
      language,
      searchCountry,
    } = this.config;
    for (const termGroup of terms) {
      const siteSearchUrl = `https://www.googleapis.com/customsearch/v1?key=${searchApiKey}&cx=${siteSearchIdCx}&dateRestrict=${timePeriod}&sort=${sortBy}&lr=${language}&gl=${searchCountry}`;
      const termsString = this.buildJobQuery(termGroup);
      const perSearchUrl = `${siteSearchUrl}&${termsString}`;

      this.queue.push({
        retries: 0,
        url: perSearchUrl,
        searchTerm: termsString,
      });
    }

    // Search places items in class-scoped this.searchReturnItems
    await this.runSearch();

    // Write to sqlite
    console.info("Preparing search results");
    const { keys, vals } = prepareObjectsForInsert(this.searchReturnItems);

    if (!vals.length) {
      console.info("No search results");
      return;
    }

    try {
      await this.db.insertData(
        `
        INSERT OR IGNORE INTO discovered_jobs (${keys.join(", ")}) 
        VALUES (${new Array(keys.length).fill("?").join(", ")})`,
        vals,
      );
      console.info(`Search return: ${vals.length} rows added to the db`);
    } catch (err) {
      console.error(`There was an error inserting search returns: ${err}`);
    }
  }

  /**
   * Private method to handle timeout
   * @param {number} ms Number of milliseconds to timeout - can be adjusted for 429 violations
   * @returns {Promise}
   */
  private timeoutPromise(ms = 100): Promise<boolean> {
    return new Promise((resolve, _) => {
      setTimeout(() => {
        resolve(true);
      }, ms);
    });
  }

  /**
   * Private method to take urls and convert them to regex for inclusion in url blocking
   * @param {string[]} blockList Array of strings of URLs to be converted to regular expression
   * @returns {RegExp} Returns a concatenated regular expression
   */
  private getRegexForBlocking(): RegExp {
    const regexReturn = [];
    for (const url of this.config.blockList) {
      const newUrl = url.split("").map((s) => {
        if (s === "/") {
          return "\\/";
        }
        if (s === ".") {
          return "\\.";
        }
        return s;
      });
      const insertionFrame = `^(.*)(${newUrl.join("")})(.*)$`;
      regexReturn.push(insertionFrame);
    }
    const regex = new RegExp(regexReturn.join("|"));
    return regex;
  }

  /**
   * Private method to remove `/apply` and `/application` when they appear at the end of url
   * @param {string} link String of URL to clean
   * @returns {string} Cleaned URL
   */
  private cleanLink(link: string): string {
    const { blockList } = this.config;
    const regex = /\/(apply|application)(?:[\/?].*)?$/;
    const filterRoots = /(\/career|job|jobsearch)(s*)(\/*)$/; // don't pass on urls ending in career(s) or job(s)
    const blockRegex = this.getRegexForBlocking();
    const cleanLink = link.replace(regex, "");
    if (filterRoots.test(cleanLink) || blockRegex.test(cleanLink)) {
      return ""; // return nothing if ends in career(s) or job
    }
    return cleanLink;
  }

  /**
   * Private method to run actual search and make additional requests if multiple pages are available
   * @returns None - Output is placed in class variable `this.searchReturnItems`.
   */
  private async runSearch() {
    if (this.queue.length === 0) return;

    // store original url to allow append of &start=n for multi-page queries
    let originalUrl = undefined;

    while (this.queue.length > 0) {
      const queueElement:
        | { url: string; retries: number; searchTerm: string }
        | undefined = this.queue.pop();
      if (!queueElement) continue;

      const { url, retries, searchTerm } = queueElement;

      if (retries >= this.maxRetries) continue;

      // set originalUrl
      if (originalUrl === undefined) originalUrl = url;

      try {
        const { data } = await axios({
          method: "GET",
          url: url,
          headers: {
            "Accept-Encoding": "gzip",
          },
        });

        const { queries, items } = data;
        if (!items) continue; // needed, as sometimes there's a valid return with no items (meaning end of query)

        const sanitizedItems = items.map(
          ({ title, link }: { title: string; link: string }) => {
            // Clean links ending in /application or /apply - remove block listed urls
            const cleanedLink = this.cleanLink(link);
            if (!cleanedLink.length) {
              return null;
            }
            return { title, link: cleanedLink };
          },
        );

        this.searchReturnItems.push(...sanitizedItems.filter(Boolean));

        // log the number of results from search
        const d = currentDatetime();
        const resultsRecordObj = {
          date: d,
          search_term: searchTerm,
          num_results: sanitizedItems.length,
        };
        writeCsv("search_term_results.csv", [resultsRecordObj]);

        // if more pages, the search result says so. Therefore if nextPage, we get the start index and
        // push the url back into the queue.
        if (queries.nextPage) {
          this.queue.push({
            retries: 0,
            url: `${originalUrl}&start=${queries.nextPage[0].startIndex}`,
            searchTerm,
          });
        }
      } catch (err) {
        this.queue.push({ url, retries: retries + 1, searchTerm });
        const errorObj = [
          {
            date: currentDatetime(),
            location: "search",
            error: JSON.stringify(err),
            url,
            retries: retries.toString(),
          },
        ];
        writeCsv("errors.csv", errorObj);
      }

      await this.timeoutPromise(500);
    }
    return;
  }
}
