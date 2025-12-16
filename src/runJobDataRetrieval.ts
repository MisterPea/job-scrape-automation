import currentDatetime from './helpers/getDate';
import writeCsv from './csvControl';
import { parseWithTimeout } from './parser/parseController';
import { VirtualBrowser } from "./VirtualBrowser";

interface ResultWithArticle {
  article: any; // Use a more specific type if possible (e.g., ArticleObject)
  [key: string]: any;
}

export class JobDataRetrieval {
  constructor(public db: any) {
    this.db = db;
  }

  /**
  * Private method to retrieve the next row in order of id
  * @returns {Object|boolean} Return is the row data as an object or false if data not present
  */
  private async getNextLink(): Promise<Record<string, any> | false> {
    const result = await this.db.getData(`
      UPDATE discovered_jobs
      SET parse_status='running'
      WHERE id = (
        SELECT id FROM discovered_jobs
        WHERE parse_status='pending'
        ORDER BY id
        LIMIT 1
      )
      RETURNING *
    `);

    if (!result) {
      console.log('No pending fetch jobs found');
      return false;
    }
    return result;
  }

  /**
   * Trunk method to request page via puppeteer and attempt to parse with Moz/Readability
   * @returns none - Returns recursive promise which resolves when all jobs complete
   */
  async retrieveJob() {
    const nextLink = await this.getNextLink();
    if (!nextLink) return;

    const vb = new VirtualBrowser();

    const { link, id } = nextLink;

    try {
      console.info(`Page fetch - Visiting: ${link}`);
      const { main } = await vb.getPage(link);
      if (!main) throw new Error('Error: No data returned from page visit')

      console.info(`Page fetch - Parsing: ${link}`);
      // Parse on thread to allow exit if processing takes too long.
      const result = await parseWithTimeout(main, link);

      if (!result) throw new Error('Error in parsing');
      const { article, siteData } = result as ResultWithArticle;

      if (!article) {
        // If Moz / Readability fails, we log the error and move on.;
        await this.db.setData(`
          UPDATE discovered_jobs
          SET parse_status='parsing_error'
          WHERE id=? AND link=?`, [id, link]);
        const errorObj = [{ date: currentDatetime(), location: "pageFetch_parse", error: `Couldn't parse link:${link}` }];
        writeCsv('errors.csv', errorObj);
        console.warn(`ERROR: Couldn't parse link:${link}`);

      } else {

        // If Moz/Readability parses, we add text_content to db
        const { title, excerpt, siteName } = article;
        await this.db.setData(`
          UPDATE discovered_jobs
          SET parse_status = ?, title = ?, excerpt = ?, site_name = ?, text_content = ?
          WHERE id=? AND link=?`, ['parsed', title, excerpt, siteName, siteData, id, link]);
      }
    } catch (err) {
      // General catch
      console.info("Error:", err);
    }
    // recursive call till all are done
    await this.retrieveJob();
  }
}
