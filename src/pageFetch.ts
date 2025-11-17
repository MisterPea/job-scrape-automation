import { Readability } from '@mozilla/readability';
import { JSDOM, VirtualConsole } from 'jsdom';
import puppeteer from 'puppeteer';
import currentDatetime from './helpers/getDate';
import writeCsv from './csvControl';

export class PageFetch {

  constructor(public db: any) {
    this.db = db;
  }

  private async getNextLink() {
    const result = await this.db.getData(`
      UPDATE discovered_jobs
      SET status='running'
      WHERE link = (
        SELECT link FROM discovered_jobs
        WHERE status='pending'
        LIMIT 1
      )
        RETURNING *
      `);

    if (!result) {
      console.log('No pending jobs found');
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

    await page.goto(link, { waitUntil: 'networkidle0' });
    const fullHtml = await page.content();

    await browser.close();

    const virtualConsole = new VirtualConsole();
    virtualConsole.off;

    const dom = new JSDOM(fullHtml, { url: link, virtualConsole });
    const reader = new Readability(dom.window.document, { charThreshold: 0 });
    const article = reader.parse();
    console.log(article);
    if (!article) {
      await this.db.setData(`UPDATE discovered_jobs SET status='parsed_error' WHERE id=? AND link=?`, [id, link]);
      const errorObj = [{ date: currentDatetime(), location: "pageFetch_parse", error: `Couldn't parse link:${link}` }];
      writeCsv('errors.csv', errorObj);
      console.warn(`ERROR: Couldn't parse link:${link}`);
    } else {
      await this.db.setData(`UPDATE discovered_jobs SET status='parsed' WHERE id=? AND link=?`, [id, link]);
      this.db.setData(`
        INSERT OR IGNORE INTO parsed_jobs (link, text_content, is_graded)
        VALUES (?, ?, ?)`,
        [link, article.textContent, 'not_graded']
      );
    }

    // recursive call till all are done
    this.getPageData();
  }

  async resetTags() {
    await this.db.getData(`
      UPDATE discovered_jobs
      SET status='pending'
      WHERE link = (
        SELECT link FROM discovered_jobs
        WHERE id=51
        LIMIT 1
      )
      RETURNING *
      `);

  }
}