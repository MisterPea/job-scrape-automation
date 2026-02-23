import { chromium, type Page } from "playwright";

type UserAgentFormat = "MOBILE" | "DESKTOP";

export class VirtualBrowser {
  public whichUserAgent: UserAgentFormat;

  constructor(whichUserAgent: UserAgentFormat = "MOBILE") {
    this.whichUserAgent = whichUserAgent;
  }

  static USER_AGENTS = {
    // *** Mobile User Agents *** //
    MOBILE: [
      {
        ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        viewport: { width: 390, height: 844 },
      },
      {
        ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        viewport: { width: 393, height: 852 },
      },
      {
        ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        viewport: { width: 375, height: 812 },
      },
      {
        ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        viewport: { width: 414, height: 896 },
      },
      {
        ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36",
        viewport: { width: 412, height: 915 },
      },
      {
        ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36",
        viewport: { width: 360, height: 800 },
      },
      {
        ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36",
        viewport: { width: 393, height: 851 },
      },
      {
        ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36",
        viewport: { width: 384, height: 854 },
      },
      {
        ua: "Mozilla/5.0 (Android 14; Mobile; rv:145.0) Gecko/145.0 Firefox/145.0",
        viewport: { width: 412, height: 915 },
      },
      {
        ua: "Mozilla/5.0 (Android 14; Mobile; rv:145.0) Gecko/145.0 Firefox/145.0",
        viewport: { width: 360, height: 800 },
      },
      {
        ua: "Mozilla/5.0 (Android 14; Mobile; rv:145.0) Gecko/145.0 Firefox/145.0",
        viewport: { width: 393, height: 851 },
      },
      {
        ua: "Mozilla/5.0 (Android 14; Mobile; rv:145.0) Gecko/145.0 Firefox/145.0",
        viewport: { width: 384, height: 854 },
      },
      {
        ua: "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
        viewport: { width: 360, height: 780 },
      },
      {
        ua: "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
        viewport: { width: 412, height: 915 },
      },
      {
        ua: "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
        viewport: { width: 384, height: 854 },
      },
      {
        ua: "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
        viewport: { width: 393, height: 851 },
      },
      {
        ua: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36 EdgA/143.0.0.0",
        viewport: { width: 360, height: 800 },
      },
      {
        ua: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36 EdgA/143.0.0.0",
        viewport: { width: 412, height: 915 },
      },
      {
        ua: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36 EdgA/143.0.0.0",
        viewport: { width: 393, height: 851 },
      },
      {
        ua: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36 EdgA/143.0.0.0",
        viewport: { width: 384, height: 854 },
      },
      {
        ua: "Mozilla/5.0 (Android 13; Mobile; rv:140.0) Gecko/140.0 Firefox/140.0",
        viewport: { width: 412, height: 915 },
      },
      {
        ua: "Mozilla/5.0 (Android 13; Mobile; rv:140.0) Gecko/140.0 Firefox/140.0",
        viewport: { width: 360, height: 800 },
      },
      {
        ua: "Mozilla/5.0 (Android 13; Mobile; rv:140.0) Gecko/140.0 Firefox/140.0",
        viewport: { width: 393, height: 851 },
      },
      {
        ua: "Mozilla/5.0 (Android 13; Mobile; rv:140.0) Gecko/140.0 Firefox/140.0",
        viewport: { width: 384, height: 854 },
      },
    ],
    // *** Desktop User Agents *** //
    DESKTOP: [
      {
        ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 DuckDuckGo/7 Safari/605.1.15",
        viewport: { width: 1920, height: 1080 },
      },
      {
        ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 DuckDuckGo/7 Safari/605.1.15",
        viewport: { width: 1368, height: 768 },
      },
      {
        ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 DuckDuckGo/7 Safari/605.1.15",
        viewport: { width: 1536, height: 864 },
      },
      {
        ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 DuckDuckGo/7 Safari/605.1.15",
        viewport: { width: 1280, height: 720 },
      },
      {
        ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
        viewport: { width: 1920, height: 1080 },
      },
      {
        ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
        viewport: { width: 1368, height: 768 },
      },
      {
        ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
        viewport: { width: 1536, height: 864 },
      },
      {
        ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 720 },
      },
      {
        ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:145.0) Gecko/20100101 Firefox/145.0",
        viewport: { width: 1920, height: 1080 },
      },
      {
        ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:145.0) Gecko/20100101 Firefox/145.0",
        viewport: { width: 1368, height: 768 },
      },
      {
        ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:145.0) Gecko/20100101 Firefox/145.0",
        viewport: { width: 1536, height: 864 },
      },
      {
        ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:145.0) Gecko/20100101 Firefox/145.0",
        viewport: { width: 1280, height: 720 },
      },
      {
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        viewport: { width: 1920, height: 1080 },
      },
      {
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        viewport: { width: 1368, height: 768 },
      },
      {
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        viewport: { width: 1536, height: 864 },
      },
      {
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 720 },
      },
      {
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
        viewport: { width: 1920, height: 1080 },
      },
      {
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
        viewport: { width: 1368, height: 768 },
      },
      {
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
        viewport: { width: 1536, height: 864 },
      },
      {
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
        viewport: { width: 1280, height: 720 },
      },
      {
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0",
        viewport: { width: 1920, height: 1080 },
      },
      {
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0",
        viewport: { width: 1368, height: 768 },
      },
      {
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0",
        viewport: { width: 1536, height: 864 },
      },
      {
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0",
        viewport: { width: 1280, height: 720 },
      },
    ],
  };

  /**
   * Private method to return a random User Agent and viewport size
   * @returns { ua: string, viewport: { width: number, height: number; }
   */
  private getAgent(): {
    ua: string;
    viewport: { width: number; height: number };
  } {
    const userAgentFormat = VirtualBrowser.USER_AGENTS[this.whichUserAgent];
    const index = Math.ceil(Math.random() * userAgentFormat.length - 1);
    return userAgentFormat[index];
  }

  /**
   * Private method that waits for page to have a document.body and innerText length > 500
   * @param page - implicitly boolean - essentially a timeout
   */
  private async waitForUi(page: Page) {
    await page.waitForFunction(
      () => document.body && document.body.innerText.length > 500,
      null,
      { timeout: 30_000 },
    );
  }

  public async getPage(
    url: string,
  ): Promise<{ main: string | undefined; linkData: string | undefined }> {
    const { ua, viewport } = this.getAgent();

    const browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--enable-webgl",
        "--use-gl=swiftshader",
        "--enable-accelerated-2d-canvas",
      ],
    });

    const context = await browser.newContext({
      userAgent: ua,
      viewport: { width: viewport.width, height: viewport.height },
      locale: "en-US",
      timezoneId: "America/New_York",
    });

    const page = await context.newPage();
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });

      await this.waitForUi(page);

      // Remove <script> and <style>
      // This redundant b/c readability takes care of it, it may reduce overall processing time
      await page.evaluate((selector) => {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          el.remove();
        }
      }, "script, style");

      const fullHtml = await page.content();
      await browser.close();

      if (!fullHtml) throw new Error("No HTML content detected");

      return { main: fullHtml, linkData: url };
    } catch (err) {
      console.error(err);
    } finally {
      await browser.close();
    }
    return { main: undefined, linkData: undefined };
  }
}
