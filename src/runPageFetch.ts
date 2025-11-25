import { Readability } from '@mozilla/readability';
import { JSDOM, VirtualConsole } from 'jsdom';
import puppeteer from 'puppeteer';
import currentDatetime from './helpers/getDate';
import writeCsv from './csvControl';

export class PageFetch {

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

  async getPageData() {
    const nextLink = await this.getNextLink();
    if (!nextLink) return;

    const { link, id } = nextLink;

    const browser = await puppeteer.launch({ args: ['--disable-notifications'] });
    const page = await browser.newPage();
    page.setUserAgent({
      userAgent: "Unartful-Labs/1.0 (+contact: unartfully@gmail.com)"
    });

    try {
      console.info(`Page fetch - Visiting: ${link}`);
      await page.goto(link, { waitUntil: 'networkidle0' });
      const fullHtml = await page.content();

      await browser.close();

      const virtualConsole = new VirtualConsole();
      virtualConsole.off;

      console.info(`Page fetch - Parsing: ${link}`);
      const dom = new JSDOM(fullHtml, { url: link, virtualConsole });
      const reader = new Readability(dom.window.document, { charThreshold: 0, disableJSONLD: true });

      const article = reader.parse();

      if (!article) {
        // If Moz/Readability fails, we log the error and move on.
        await this.db.setData(`
          UPDATE discovered_jobs
          SET parse_status='parsing_error'
          WHERE id=? AND link=?`, [id, link]);
        const errorObj = [{ date: currentDatetime(), location: "pageFetch_parse", error: `Couldn't parse link:${link}` }];
        writeCsv('errors.csv', errorObj);
        console.warn(`ERROR: Couldn't parse link:${link}`);

      } else {

        // If Moz/Readability parses, we add text_content to db
        const { title, textContent, excerpt, siteName } = article;
        await this.db.setData(`
          UPDATE discovered_jobs
          SET parse_status = ?, title = ?, excerpt = ?, site_name = ?, text_content = ?
          WHERE id=? AND link=?`, ['parsed', title, excerpt, siteName, textContent, id, link]);
      }
    } catch (err) {
      const errorObj = [{ date: currentDatetime(), location: 'pageFetch-general', error: err, url: link, retries: null }];
      writeCsv('errors.csv', errorObj);
      await this.db.setData(`
        UPDATE discovered_jobs
        SET parse_status='failed' 
        WHERE id=? AND link=?`, [id, link]);
      await browser.close();
    }

    // recursive call till all are done
    await this.getPageData();
  }

  async resetRunningTags() {
    await this.db.setData(`
      UPDATE discovered_jobs
      SET parse_status='pending'
      WHERE parse_status='running'
      `, []);
  }
}